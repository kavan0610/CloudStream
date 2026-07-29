const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createPlaylist = async (req, res) => {
  const { userId, name, coverImage } = req.body;
  try {
    // 1. Prevent duplicate names
    const existing = await prisma.playlist.findFirst({
      where: { 
        userId: userId, 
        name: { equals: name, mode: 'insensitive' } // Case-insensitive check
      }
    });

    if (existing) {
      return res.status(400).json({ error: "A playlist with this name already exists." });
    }

    // 2. Create the playlist
    const playlist = await prisma.playlist.create({
      data: { userId, name, coverImage }
    });
    
    res.status(201).json({ playlist });
  } catch (error) {
    res.status(500).json({ error: "Failed to create playlist" });
  }
};

const getUserPlaylists = async (req, res) => {
  const { userId } = req.params;
  try {
    // LIGHTWEIGHT FETCH: Notice we removed the heavy "include: { tracks }" block!
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      orderBy: { name: 'asc' } // Optional: keeps them alphabetized
    });
    
    res.status(200).json({ playlists });
  } catch (error) {
    console.error("Failed to fetch playlists:", error);
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
};

// Fetches the playlist AND all the tracks inside it
const getPlaylistDetails = async (req, res) => {
  const { playlistId } = req.params;
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      // FIX: Ensure Prisma joins the tracks table when fetching!
      include: {
        tracks: {
          include: {
            track: true
          }
        }
      }
    });

    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    res.status(200).json({ playlist });
  } catch (error) {
    console.error("Failed to fetch playlist details:", error);
    res.status(500).json({ error: "Failed to fetch playlist details" });
  }
};

const updatePlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { name, coverImage, userId } = req.body;
  try {
    // Check for duplicate name, but ignore the current playlist's name
    const existing = await prisma.playlist.findFirst({
      where: { 
        userId: userId, 
        name: { equals: name, mode: 'insensitive' },
        id: { not: playlistId }
      }
    });

    if (existing) return res.status(400).json({ error: "A playlist with this name already exists." });

    const playlist = await prisma.playlist.update({
      where: { id: playlistId },
      data: { name, coverImage }
    });
    
    res.status(200).json({ playlist });
  } catch (error) {
    res.status(500).json({ error: "Failed to update playlist" });
  }
};

const deletePlaylist = async (req, res) => {
  const { playlistId } = req.params;
  try {
    await prisma.playlist.delete({
      where: { id: playlistId }
    });
    res.status(200).json({ message: "Playlist deleted successfully" });
  } catch (error) {
    console.error("Failed to delete playlist:", error);
    res.status(500).json({ error: "Failed to delete playlist" });
  }
};

const addTracksToPlaylist = async (req, res) => {
  const id = req.params.id || req.params.playlistId; 
  const { trackIds } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Playlist ID is missing from URL" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Add tracks to the Playlist
      if (trackIds && trackIds.length > 0) {
        const data = trackIds.map(trackId => ({ playlistId: id, trackId }));
        await tx.playlistTrack.createMany({
          data,
          skipDuplicates: true 
        });
      }

      // 2. TWO-WAY SYNC
      const playlist = await tx.playlist.findUnique({ where: { id } });
      
      if (playlist) {
        const isFavorites = playlist.name.toLowerCase() === 'favorites' || playlist.name.toLowerCase() === 'favourites';

        if (isFavorites && trackIds && trackIds.length > 0) {
          await tx.track.updateMany({
            where: { id: { in: trackIds } },
            data: { isFavourite: true } 
          });
        }
      }
    });

    res.status(200).json({ message: "Songs added successfully" });
  } catch (error) {
    console.error("Failed to add tracks:", error);
    res.status(500).json({ error: "Failed to add songs" });
  }
};

const updatePlaylistTracks = async (req, res) => {
  const { id } = req.params; // This is the playlistId
  const { trackIds } = req.body;

  try {
    // Wrap EVERYTHING in a transaction
    await prisma.$transaction(async (tx) => {
      
      const playlist = await tx.playlist.findUnique({ where: { id } });
      if (!playlist) throw new Error("Playlist not found");
      
      const isFavorites = playlist.name.toLowerCase() === 'favorites' || playlist.name.toLowerCase() === 'favourites';

      // 1. Wipe old links
      await tx.playlistTrack.deleteMany({ where: { playlistId: id } });

      // 2. Insert new ordered links
      if (trackIds && trackIds.length > 0) {
        await tx.playlistTrack.createMany({
          data: trackIds.map((trackId) => ({ playlistId: id, trackId }))
        });
      }

      // 3. TWO-WAY SYNC
      if (isFavorites) {
        // 🚨 BUG FIXED: Only reset favorites for THIS specific user!
        await tx.track.updateMany({ 
          where: { userId: playlist.userId },
          data: { isFavourite: false } 
        });
        
        // Turn the stars back on for the tracks that were kept
        if (trackIds && trackIds.length > 0) {
          await tx.track.updateMany({
            where: { id: { in: trackIds } },
            data: { isFavourite: true }
          });
        }
      }
    });

    res.status(200).json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Failed to update playlist tracks:", error);
    res.status(500).json({ error: "Failed to update" });
  }
};

module.exports = { createPlaylist, getUserPlaylists, getPlaylistDetails, updatePlaylist, deletePlaylist, addTracksToPlaylist, updatePlaylistTracks };