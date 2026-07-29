const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const mm = require('music-metadata');
const prisma = new PrismaClient();

const activeJobs = new Map();

// Kicked off when the user clicks "Connect Folder" or changes folders
const startSync = async (req, res) => {
  const { userId, folderId, accessToken } = req.body;

  if (!userId || !folderId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 1. THE FIX: Wrap the wipe-and-rebuild in a Transaction
    if (user.driveFolderId && user.driveFolderId !== folderId) {
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

    await prisma.user.update({
      where: { id: userId },
      data: { driveFolderId: folderId }
    });

    const jobId = `sync_${Date.now()}`;
    activeJobs.set(jobId, { status: "initializing", progress: 0 });
    res.status(202).json({ jobId, message: "Reconciliation started" });

    runStateReconciliation(jobId, userId, folderId);

  } catch (error) {
    console.error("Failed to start sync:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Kicked off silently when the user logs in
const handleLoginDeltaSync = async (req, res) => {
  const { userId } = req.body; // accessToken no longer strictly needed

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.driveFolderId) {
      return res.status(200).json({ message: "No folder linked yet." });
    }

    const jobId = `login_sync_${Date.now()}`;
    activeJobs.set(jobId, { status: "checking_changes", progress: 0 });

    res.status(202).json({ jobId, message: "Login sync started" });

    // Run the exact same robust worker!
    runStateReconciliation(jobId, user.id, user.driveFolderId);

  } catch (error) {
    console.error("Login sync trigger failed:", error);
    res.status(500).json({ error: "Internal sync failure" });
  }
};

// ==========================================
// THE CORE WORKER: STATE RECONCILIATION
// ==========================================
const runStateReconciliation = async (jobId, userId, folderId) => {
  try {
    // 1. Fetch the user directly to guarantee we have the absolute latest DB token
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.refreshToken) {
      throw new Error("User does not have a valid refresh token in the database.");
    }

    // 2. Build a smart OAuth2 client that can self-refresh using your backend credentials
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    // 3. Force Google Auth Library to use the permanent DB token.
    // It will automatically fetch a fresh access_token with the correct Drive scopes.
    auth.setCredentials({ refresh_token: user.refreshToken });
    
    const drive = google.drive({ version: 'v3', auth });

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
      details: `Removing ${trackIdsToDelete.length}, Adding ${filesToAdd.length}` 
    });

    // A. Delete orphaned tracks
    if (trackIdsToDelete.length > 0) {
      await prisma.track.deleteMany({
        where: { id: { in: trackIdsToDelete } }
      });
    }

    // B. Insert new tracks WITH ID3 METADATA PARSING (Concurrently)
    const CONCURRENCY_LIMIT = 5; 
    let processedCount = 0;

    for (let i = 0; i < filesToAdd.length; i += CONCURRENCY_LIMIT) {
      const batch = filesToAdd.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(batch.map(async (file) => {
        let parsedTitle = file.name;
        let parsedArtist = null;
        let parsedAlbum = null;
        let parsedDuration = null;

        // THE FIX: Put the ENTIRE process (parsing AND saving) in the try/catch
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
          
          // MOVED INSIDE THE TRY BLOCK
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
          // If a file fails to stream, parse, OR save, we just log it and move on!
          console.error(`Skipping file ${file.name} due to error:`, error.message);
        }
      }));

      processedCount += batch.length;
      const percent = Math.round((processedCount / filesToAdd.length) * 100);
      activeJobs.set(jobId, { status: "syncing_metadata", progress: percent });
    }

    activeJobs.set(jobId, { status: "complete", progress: 100 });

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    activeJobs.set(jobId, { status: "failed", error: error.message });
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