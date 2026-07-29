import { useState, useEffect, useCallback } from 'react';
import { playlistApi } from '../services/api';

export const usePlaylists = (userId) => {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. The Background Hydrator (Silent)
  const hydratePlaylists = async (lightweightPlaylists) => {
    // We loop through them one by one to prevent overloading the network
    for (const playlist of lightweightPlaylists) {
      try {
        const response = await playlistApi.fetchPlaylist(playlist.id);
        const fullPlaylist = response.data.playlist;
        
        // Silently swap the lightweight version with the fully loaded version in React state
        setPlaylists(prev => 
          prev.map(p => p.id === playlist.id ? fullPlaylist : p)
        );
      } catch (error) {
        console.error(`Hydration failed for playlist ${playlist.id}`, error);
      }
    }
  };

  // 1. The Instant Boot (Loud)
  const fetchPlaylists = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      
      // Step A: Fetch just the names/covers (Takes milliseconds)
      const response = await playlistApi.fetchUserPlaylists(userId);
      const lightweightPlaylists = response.data.playlists || [];
      
      // Step B: Instantly render the sidebar
      setPlaylists(lightweightPlaylists);
      setIsLoading(false); 

      // Step C: Trigger the background download of the actual songs
      if (lightweightPlaylists.length > 0) {
        hydratePlaylists(lightweightPlaylists);
      }

    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = async (name, coverImage) => {
    try {
      const response = await playlistApi.createPlaylist(userId, name, coverImage);
      const newPlaylist = response.data.playlist;
      // Initialize with an empty tracks array so it doesn't crash before hydration
      setPlaylists(prev => [...prev, { ...newPlaylist, tracks: [] }]);
      return true;
    } catch (error) {
      console.error("Creation failed:", error);
      return false;
    }
  };

  const updatePlaylist = async (id, name, coverImage) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name, coverImage } : p));
    try {
      await playlistApi.updatePlaylist(id, name, coverImage);
    } catch (error) {
      console.error("Edit failed:", error);
      fetchPlaylists(); 
    }
  };

  const deletePlaylist = async (playlistId) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    try {
      await playlistApi.deletePlaylist(playlistId);
    } catch (error) {
      console.error("Delete failed:", error);
      fetchPlaylists(); 
    }
  };

  const refreshSinglePlaylist = async (playlistId) => {
    try {
      const response = await playlistApi.fetchPlaylist(playlistId);
      const updatedPlaylist = response.data.playlist;
      setPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
      return updatedPlaylist;
    } catch (error) {
      console.error("Refresh single playlist failed:", error);
      return null;
    }
  };

  return {
    playlists, isLoading, setPlaylists, createPlaylist, 
    updatePlaylist, deletePlaylist, refreshSinglePlaylist, fetchPlaylists
  };
};