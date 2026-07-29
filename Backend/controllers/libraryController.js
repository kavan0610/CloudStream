const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();


const getUserLibrary = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "Missing User ID parameters" });
  }

  try {
    // Instantly fetch all tracks belonging to this user using the index
    const tracks = await prisma.track.findMany({
      where: { userId: userId },
      orderBy: { title: 'asc' } // Alphabetical sorting
    });

    res.status(200).json({ tracks });
  } catch (error) {
    console.error("Library Controller Error:", error);
    res.status(500).json({ error: "Failed to retrieve audio library" });
  }
};

const toggleFavorite = async (req, res) => {
  const { trackId } = req.params;
  const { isFavourite, userId } = req.body;

  try {
    // Start the Transaction!
    const updatedTrack = await prisma.$transaction(async (tx) => {
      
      // 1. Update the Track
      const track = await tx.track.update({
        where: { id: trackId },
        data: { isFavourite }
      });

      // 2. Find or Create the Playlist
      let favoritesPlaylist = await tx.playlist.findFirst({
        where: { 
          userId: userId, 
          name: { in: ['Favorites', 'favorites', 'Favourites', 'favourites'] } 
        }
      });

      if (!favoritesPlaylist) {
        favoritesPlaylist = await tx.playlist.create({
          data: { name: 'Favorites', userId: userId, coverImage: 'bg-yellow-500' }
        });
      }

      // 3. Sync the Track with the Playlist
      if (isFavourite) {
        const existing = await tx.playlistTrack.findFirst({
          where: { playlistId: favoritesPlaylist.id, trackId: trackId }
        });
        if (!existing) {
          await tx.playlistTrack.create({
            data: { playlistId: favoritesPlaylist.id, trackId: trackId }
          });
        }
      } else {
        await tx.playlistTrack.deleteMany({
          where: { playlistId: favoritesPlaylist.id, trackId: trackId }
        });
      }

      return track; // Pass the track out of the transaction
    });

    res.status(200).json(updatedTrack);
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
};

module.exports = { getUserLibrary, toggleFavorite };