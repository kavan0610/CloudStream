const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const mm = require('music-metadata');
const prisma = new PrismaClient();

const activeJobs = new Map();

// Kicked off when the user clicks "Connect Folder" or changes folders
const startSync = async (req, res) => {
  const { userId, folderId } = req.body;

  if (!userId || !folderId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const folderChanged = user?.driveFolderId && user.driveFolderId !== folderId;

    if (folderChanged) {
      console.log(`Folder changed for user ${userId}. Wiping old library and playlists...`);
      
      await prisma.$transaction(async (tx) => {
        await tx.playlist.deleteMany({ where: { userId: userId } });
        await tx.track.deleteMany({ where: { userId: userId } });
        
        await tx.playlist.create({
          data: {
            userId: userId,
            name: "Favorites",
            coverImage: "bg-gradient-to-br from-indigo-500 to-purple-500"
          }
        });
      });
    }

    // Reset syncToken if folder changed so full sync initializes a new page token
    await prisma.user.update({
      where: { id: userId },
      data: {
        driveFolderId: folderId,
        syncToken: folderChanged ? null : user.syncToken
      }
    });

    const jobId = `sync_${Date.now()}`;
    activeJobs.set(jobId, { status: "initializing", progress: 0 });
    res.status(202).json({ jobId, message: "Reconciliation started" });

    runSyncOrchestrator(jobId, userId, folderId);

  } catch (error) {
    console.error("Failed to start sync:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Kicked off silently when the user logs in
const handleLoginDeltaSync = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.driveFolderId) {
      return res.status(200).json({ message: "No folder linked yet." });
    }

    const jobId = `login_sync_${Date.now()}`;
    activeJobs.set(jobId, { status: "checking_changes", progress: 0 });

    res.status(202).json({ jobId, message: "Login sync started" });

    runSyncOrchestrator(jobId, user.id, user.driveFolderId);

  } catch (error) {
    console.error("Login sync trigger failed:", error);
    res.status(500).json({ error: "Internal sync failure" });
  }
};

// ==========================================
// MAIN ORCHESTRATOR
// ==========================================
const runSyncOrchestrator = async (jobId, userId, folderId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.refreshToken) {
      throw new Error("User does not have a valid refresh token in the database.");
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: user.refreshToken });
    const drive = google.drive({ version: 'v3', auth });

    let deltaSuccess = false;

    // 1. Try Changes API first if syncToken exists
    if (user.syncToken) {
      try {
        console.log(`[Job ${jobId}] Attempting Delta Sync using Changes API...`);
        await runDeltaChangesSync(jobId, user, drive, folderId);
        deltaSuccess = true;
      } catch (deltaError) {
        console.warn(`[Job ${jobId}] Delta sync failed (${deltaError.message}). Falling back to full reconciliation...`);
      }
    } else {
      console.log(`[Job ${jobId}] No syncToken found. Running full reconciliation...`);
    }

    // 2. Fallback to full reconciliation if Delta Sync was skipped or failed
    if (!deltaSuccess) {
      await runFullReconciliation(jobId, userId, drive, folderId);
    }

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    activeJobs.set(jobId, { status: "failed", error: error.message });
  }
};

// ==========================================
// OPTION 1: DELTA SYNC (CHANGES API)
// ==========================================
const runDeltaChangesSync = async (jobId, user, drive, folderId) => {
  activeJobs.set(jobId, { status: "checking_changes", progress: 0 });

  let pageToken = user.syncToken;
  let changes = [];
  let newSyncToken = null;

  while (pageToken) {
    const response = await drive.changes.list({
      pageToken: pageToken,
      fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, parents, trashed))',
      pageSize: 1000
    });

    if (response.data.changes) {
      changes = changes.concat(response.data.changes);
    }

    if (response.data.newStartPageToken) {
      newSyncToken = response.data.newStartPageToken;
    }

    pageToken = response.data.nextPageToken;
  }

  // Fetch current user tracks from DB to evaluate changes
  const dbTracks = await prisma.track.findMany({
    where: { userId: user.id },
    select: { id: true, driveFileId: true }
  });
  const dbTrackMap = new Map(dbTracks.map(t => [t.driveFileId, t.id]));

  const filesToAdd = [];
  const trackIdsToDelete = new Set();

  for (const change of changes) {
    const fileId = change.fileId;
    const file = change.file;

    // Check if removed from drive, trashed, or moved out of the designated folder
    const isRemoved = change.removed || (file && (file.trashed || !file.parents || !file.parents.includes(folderId)));

    if (isRemoved) {
      if (dbTrackMap.has(fileId)) {
        trackIdsToDelete.add(dbTrackMap.get(fileId));
      }
    } else if (file) {
      const isAudio = file.mimeType && (file.mimeType.startsWith('audio/') || file.mimeType === 'application/x-flac');
      const isInFolder = file.parents && file.parents.includes(folderId);

      if (isAudio && isInFolder && !dbTrackMap.has(file.id)) {
        filesToAdd.push(file);
      }
    }
  }

  const tracksToDeleteArray = Array.from(trackIdsToDelete);

  activeJobs.set(jobId, {
    status: "syncing_metadata",
    progress: 0,
    details: `Delta Sync: Removing ${tracksToDeleteArray.length}, Adding ${filesToAdd.length}`
  });

  // Delete tracks
  if (tracksToDeleteArray.length > 0) {
    await prisma.track.deleteMany({
      where: { id: { in: tracksToDeleteArray } }
    });
  }

  // Parse and insert added tracks
  await processAndInsertFiles(filesToAdd, drive, user.id, jobId);

  // Update syncToken in DB
  if (newSyncToken) {
    await prisma.user.update({
      where: { id: user.id },
      data: { syncToken: newSyncToken }
    });
  }

  activeJobs.set(jobId, { status: "complete", progress: 100 });
};

// ==========================================
// OPTION 2: FALLBACK FULL RECONCILIATION
// ==========================================
const runFullReconciliation = async (jobId, userId, drive, folderId) => {
  activeJobs.set(jobId, { status: "scanning", progress: 0 });

  let driveFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'audio/' or mimeType = 'application/x-flac') and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 500,
      pageToken: pageToken
    });

    if (response.data.files) {
      driveFiles = driveFiles.concat(response.data.files);
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  const dbTracks = await prisma.track.findMany({
    where: { userId: userId },
    select: { id: true, driveFileId: true }
  });

  const driveFileIds = new Set(driveFiles.map(f => f.id));
  const dbFileIds = new Set(dbTracks.map(t => t.driveFileId));

  const trackIdsToDelete = dbTracks
    .filter(track => !driveFileIds.has(track.driveFileId))
    .map(track => track.id);

  const filesToAdd = driveFiles.filter(file => !dbFileIds.has(file.id));

  activeJobs.set(jobId, {
    status: "syncing_metadata",
    progress: 0,
    details: `Full Sync: Removing ${trackIdsToDelete.length}, Adding ${filesToAdd.length}`
  });

  if (trackIdsToDelete.length > 0) {
    await prisma.track.deleteMany({
      where: { id: { in: trackIdsToDelete } }
    });
  }

  await processAndInsertFiles(filesToAdd, drive, userId, jobId);

  // Initialize fresh syncToken for future Delta Syncs
  try {
    const tokenRes = await drive.changes.getStartPageToken({});
    if (tokenRes.data.startPageToken) {
      await prisma.user.update({
        where: { id: userId },
        data: { syncToken: tokenRes.data.startPageToken }
      });
    }
  } catch (err) {
    console.warn(`[Job ${jobId}] Failed to fetch startPageToken:`, err.message);
  }

  activeJobs.set(jobId, { status: "complete", progress: 100 });
};

// ==========================================
// HELPER: METADATA EXTRACTION & DB BATCHING
// ==========================================
const processAndInsertFiles = async (filesToAdd, drive, userId, jobId) => {
  if (filesToAdd.length === 0) return;

  const CONCURRENCY_LIMIT = 5;
  let processedCount = 0;

  for (let i = 0; i < filesToAdd.length; i += CONCURRENCY_LIMIT) {
    const batch = filesToAdd.slice(i, i + CONCURRENCY_LIMIT);

    await Promise.all(batch.map(async (file) => {
      let parsedTitle = file.name;
      let parsedArtist = null;
      let parsedAlbum = null;
      let parsedDuration = null;

      try {
        const response = await drive.files.get(
          { fileId: file.id, alt: 'media' },
          { responseType: 'stream' }
        );

        const metadata = await mm.parseStream(response.data, { mimeType: file.mimeType }, { duration: true });

        if (metadata.common) {
          parsedTitle = metadata.common.title || file.name;
          parsedArtist = metadata.common.artist || null;
          parsedAlbum = metadata.common.album || null;
        }
        if (metadata.format && metadata.format.duration) {
          parsedDuration = Math.round(metadata.format.duration);
        }

        await prisma.track.create({
          data: {
            userId: userId,
            driveFileId: file.id,
            title: parsedTitle,
            artist: parsedArtist,
            album: parsedAlbum,
            duration: parsedDuration,
            mimeType: file.mimeType || 'audio/mpeg'
          }
        });

      } catch (error) {
        console.error(`Skipping file ${file.name} due to error:`, error.message);
      }
    }));

    processedCount += batch.length;
    const percent = Math.round((processedCount / filesToAdd.length) * 100);
    activeJobs.set(jobId, { status: "syncing_metadata", progress: percent });
  }
};

const getSyncStatus = (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
};

module.exports = { startSync, getSyncStatus, handleLoginDeltaSync };