// src/hooks/useLibraryManager.js
import { useState, useCallback } from 'react';
import { libraryApi, playlistApi } from '../services/api';
import { CacheEngine } from '../utils/CacheEngine';

export const useLibraryManager = (user, playlists, setPlaylists, fetchPlaylists, navigate, location) => {
  const [tracks, setTracks] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const fetchLibrary = useCallback(async () => {
    if (tracks.length === 0) setLibraryLoading(true);
    try {
      const response = await libraryApi.fetchLibrary(user.id);
      setTracks(response.data.tracks);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLibraryLoading(false); 
    }
  }, [user.id, tracks.length]);

  const updatePlaylistOptimistically = useCallback((playlistId, updatedTracks) => {
    setPlaylists(prevPlaylists => 
      prevPlaylists.map(p => {
        if (p.id === playlistId) {
          return { ...p, tracks: updatedTracks.map(t => ({ track: t })) };
        }
        return p;
      })
    );
  }, [setPlaylists]);

  const handleToggleFavorite = async (trackId, currentStatus) => {
    const newStatus = !currentStatus;
    
    // 1. Instant UI: Library
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, isFavourite: newStatus } : t));

    // 2. Instant UI: Playlists
    setPlaylists(prevPlaylists => {
      return prevPlaylists.map(playlist => {
        const isFavPlaylist = playlist.name.toLowerCase() === 'favorites' || playlist.name.toLowerCase() === 'favourites';
        if (!isFavPlaylist) return playlist;

        if (newStatus) {
          if (playlist.tracks?.some(pt => pt.track.id === trackId)) return playlist;
          const baseTrack = tracks.find(t => t.id === trackId) || { id: trackId };
          return { ...playlist, tracks: [...(playlist.tracks || []), { track: { ...baseTrack, isFavourite: true } }] };
        } else {
          return { ...playlist, tracks: (playlist.tracks || []).filter(pt => pt.track.id !== trackId) };
        }
      });
    });

    // 3. Background Cache
    if (!newStatus) {
      const trackToCache = tracks.find(t => t.id === trackId);
      if (trackToCache) CacheEngine.removeTrack(trackToCache.driveFileId);
    }

    // 4. API Sync
    try {
      await libraryApi.toggleFavorite(trackId, newStatus, user.id);
    } catch (error) {
      console.error("Favorite toggle failed:", error);
      // Rollback logic...
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, isFavourite: currentStatus } : t));
    }
  };

  const handleFavoritesClick = async () => {
    let fav = playlists.find(p => p.name.toLowerCase() === 'favorites' || p.name.toLowerCase() === 'favourites');
    if (fav) {
      navigate(`/dashboard/playlist/${fav.id}`, { state: location.state });
    } else {
      try {
        const response = await playlistApi.createFavoritesPlaylist(user.id);
        fetchPlaylists(); 
        navigate(`/dashboard/playlist/${response.data.id}`, { state: location.state });
      } catch (error) {
        console.error("Failed to create Favorites playlist", error);
      }
    }
  };

  return { tracks, libraryLoading, fetchLibrary, handleToggleFavorite, updatePlaylistOptimistically, handleFavoritesClick };
};