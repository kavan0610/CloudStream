import React, { useState, useEffect, useMemo } from 'react';
import { playlistApi } from '../services/api'; // <-- NEW API IMPORT
import TrackTable from './TrackTable';
import AddSongsModal from './AddSongsModal';
import EditSongsModal from './EditSongsModal';
import { useAudio } from '../context/AudioContext';

const PlaylistPage = ({ playlist, onBack, libraryTracks = [], onDelete, onRefresh, optimisticUpdate }) => {
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [isEditSongsOpen, setIsEditSongsOpen] = useState(false);
  
  // ADDED prepareContext here
  const { prepareContext, playContext, preloadContext, syncActiveContext } = useAudio();

  const flattenedTracks = useMemo(() => {
    return playlist?.tracks ? playlist.tracks.map(pt => pt.track) : [];
  }, [playlist?.tracks]);

  // UPDATED: Calculate the zero-latency queues and preload both!
  useEffect(() => {
    if (flattenedTracks.length > 0) {
      const { original, shuffled } = prepareContext(flattenedTracks);
      preloadContext(original, shuffled);
    }
  }, [flattenedTracks, prepareContext, preloadContext]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleSaveSongs = async (trackIds) => {
    setIsAddSongsOpen(false); 

    const tracksToAdd = trackIds
      .map(id => libraryTracks.find(t => t.id === id))
      .filter(Boolean);

    const newTracks = [...flattenedTracks];
    tracksToAdd.forEach(t => {
      if (!newTracks.find(nt => nt.id === t.id)) {
        newTracks.push(t);
      }
    });

    if (optimisticUpdate) optimisticUpdate(playlist.id, newTracks);
    syncActiveContext(newTracks);

    try {
      // CLEAN API CALL
      await playlistApi.addTracks(playlist.id, trackIds);
      if (onRefresh) onRefresh(); 
    } catch (error) {
      console.error("Failed to add tracks:", error);
      if (optimisticUpdate) optimisticUpdate(playlist.id, flattenedTracks);
    }
  };

  const handleUpdateEditedSongs = async (newTrackIds) => {
    setIsEditSongsOpen(false); 

    const newTracks = newTrackIds
      .map(id => libraryTracks.find(t => t.id === id) || flattenedTracks.find(t => t.id === id))
      .filter(Boolean);

    if (optimisticUpdate) optimisticUpdate(playlist.id, newTracks);

    try {
      // CLEAN API CALL
      await playlistApi.updateTracks(playlist.id, newTrackIds);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update songs.");
      if (optimisticUpdate) optimisticUpdate(playlist.id, flattenedTracks);
    }
  };

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    if (onDelete) onDelete(playlist.id);
  };

  if (!playlist) return null;

  return (
    <div className="w-full flex flex-col animate-fade-in">
      
      <AddSongsModal isOpen={isAddSongsOpen} onClose={() => setIsAddSongsOpen(false)} onSave={handleSaveSongs} libraryTracks={libraryTracks} playlistTracks={flattenedTracks} />
      <EditSongsModal isOpen={isEditSongsOpen} onClose={() => setIsEditSongsOpen(false)} onSave={handleUpdateEditedSongs} playlistTracks={flattenedTracks} />

      <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold mb-4 md:mb-8 transition-colors w-fit group">
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Back to Library
      </button>
      
      <div className="flex flex-row items-center md:items-stretch gap-4 md:gap-8 mb-6 md:mb-8 md:h-48 w-full">
        
        <div className={`w-28 h-28 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl ${playlist.coverImage || 'bg-gray-800'} flex items-center justify-center shrink-0 relative group`}>
          <svg className="w-10 h-10 md:w-16 md:h-16 text-white/50" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
        </div>
        
        <div className="flex flex-col justify-center md:justify-between flex-1 py-1 w-full min-w-0">
          <div>
            <p className="text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Playlist</p>
            <h1 className="font-display text-2xl sm:text-3xl md:text-7xl font-bold truncate md:line-clamp-2 md:whitespace-normal">{playlist.name}</h1>
          </div>

          <div className="flex flex-col xl:flex-row items-center justify-between w-full gap-1.5 md:gap-4 mt-2 md:mt-0">
            <div className="flex w-full xl:w-auto items-center gap-1.5 md:gap-3">
              <button onClick={() => setIsAddSongsOpen(true)} className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white/10 hover:bg-white/20 text-white px-2 md:px-6 py-1.5 md:py-3 rounded-full font-bold transition-all text-[11px] md:text-sm md:min-w-[140px]">
                <svg className="w-3 h-3 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> Add
              </button>
              
              <button onClick={() => setIsEditSongsOpen(true)} className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white/10 hover:bg-white/20 text-white px-2 md:px-6 py-1.5 md:py-3 rounded-full font-bold transition-all text-[11px] md:text-sm md:min-w-[140px]">
                <svg className="w-3 h-3 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Edit
              </button>
            </div>

            <div className="flex w-full xl:w-auto items-center gap-1.5 md:gap-3">
              <button onClick={() => playContext(flattenedTracks, 0, false)} className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-blue-600 hover:bg-blue-500 text-white px-2 md:px-6 py-1.5 md:py-3 rounded-full font-bold transition-all text-[11px] md:text-sm shadow-md md:min-w-[140px]">
                <svg className="w-3 h-3 md:w-4 md:h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Play
              </button>
              <button onClick={() => playContext(flattenedTracks, 0, true)} className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white/10 hover:bg-white/20 text-white px-2 md:px-6 py-1.5 md:py-3 rounded-full font-bold transition-all text-[11px] md:text-sm md:min-w-[140px]">
                <svg className="w-3 h-3 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg> Shuffle
              </button>
            </div>
          </div>
        </div>
      </div>

      <TrackTable tracks={flattenedTracks} showStar={false} />
    </div>
  );
};

export default PlaylistPage;