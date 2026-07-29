// src/hooks/useAudioCacheEngine.js
import { useEffect, useCallback } from 'react';

export const useAudioCacheEngine = (audioCache, driveToken, queue, currentIndex, repeatMode) => {
  
  // GAPLESS PLAYBACK PRELOADER (SLIDING WINDOW)
  useEffect(() => {
    if (!driveToken || currentIndex < 0 || queue.length === 0) return;

    const CACHE_WINDOW_NEXT = 2; 
    const CACHE_WINDOW_PREV = 2; 
    
    const currentTrack = queue[currentIndex];
    const tracksToKeepReady = [];

    for (let i = 1; i <= CACHE_WINDOW_NEXT; i++) {
      let nextIdx = currentIndex + i;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') nextIdx = nextIdx % queue.length;
        else break;
      }
      if (queue[nextIdx]) tracksToKeepReady.push(queue[nextIdx]);
    }

    for (let i = 1; i <= CACHE_WINDOW_PREV; i++) {
      let prevIdx = currentIndex - i;
      if (prevIdx < 0) {
        if (repeatMode === 'all') prevIdx = (queue.length + prevIdx) % queue.length;
        else break;
      }
      if (queue[prevIdx]) tracksToKeepReady.push(queue[prevIdx]);
    }

    const keepIds = [currentTrack?.id, ...tracksToKeepReady.map(t => t.id)].filter(Boolean);

    Object.keys(audioCache.current).forEach(id => {
      if (!keepIds.includes(id)) {
        if (audioCache.current[id] && audioCache.current[id] !== 'downloading') {
          URL.revokeObjectURL(audioCache.current[id]); 
        }
        delete audioCache.current[id];
      }
    });

    tracksToKeepReady.forEach(track => {
      if (!audioCache.current[track.id]) {
        audioCache.current[track.id] = 'downloading'; 
        
        fetch(`https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, {
          headers: { Authorization: `Bearer ${driveToken}` }
        })
        .then(res => res.ok ? res.blob() : Promise.reject('Failed'))
        .then(blob => {
          if (audioCache.current[track.id] === 'downloading') {
            audioCache.current[track.id] = URL.createObjectURL(blob);
          }
        })
        .catch(() => {
          if (audioCache.current[track.id] === 'downloading') {
            delete audioCache.current[track.id];
          }
        });
      }
    });
  }, [currentIndex, queue, driveToken, repeatMode, audioCache]);

  // SPECULATIVE UI PRELOADER
  const preloadContext = useCallback((tracks) => {
    if (!tracks || tracks.length === 0 || !driveToken) return;

    const firstTrack = tracks[0];
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

    const tracksToPreload = [firstTrack, randomTrack].filter((t, index, self) => 
      t && self.findIndex(s => s.id === t.id) === index && !audioCache.current[t.id]
    );

    tracksToPreload.forEach(track => {
      audioCache.current[track.id] = 'downloading'; 
      fetch(`https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, {
        headers: { Authorization: `Bearer ${driveToken}` }
      })
      .then(res => res.ok ? res.blob() : Promise.reject('Failed'))
      .then(blob => {
        if (audioCache.current[track.id] === 'downloading') {
          audioCache.current[track.id] = URL.createObjectURL(blob);
        }
      })
      .catch(() => {
        if (audioCache.current[track.id] === 'downloading') delete audioCache.current[track.id];
      });
    });
  }, [driveToken, audioCache]);

  return { preloadContext };
};