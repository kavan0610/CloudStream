import { useEffect, useCallback } from 'react';

export const useAudioCacheEngine = (audioCache, driveToken, queue, currentIndex, repeatMode) => {
  
  // THE ROBUST FIX: Extract your exact sliding window logic into a callable function
  const updateWindow = useCallback((targetIndex) => {
    if (!driveToken || targetIndex < 0 || queue.length === 0) return;

    const CACHE_WINDOW_NEXT = 2; 
    const CACHE_WINDOW_PREV = 2; 
    
    const currentTrack = queue[targetIndex];
    const tracksToKeepReady = [];

    for (let i = 1; i <= CACHE_WINDOW_NEXT; i++) {
      let nextIdx = targetIndex + i;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') nextIdx = nextIdx % queue.length;
        else break;
      }
      if (queue[nextIdx]) tracksToKeepReady.push(queue[nextIdx]);
    }

    for (let i = 1; i <= CACHE_WINDOW_PREV; i++) {
      let prevIdx = targetIndex - i;
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
  }, [queue, driveToken, repeatMode, audioCache]);

  // Keep it synced with React when the app is active
  useEffect(() => {
    updateWindow(currentIndex);
  }, [currentIndex, updateWindow]);

  const preloadContext = useCallback((originalQueue = [], shuffledQueue = []) => {
    if (!originalQueue || originalQueue.length === 0 || !driveToken) return;

    const tracksToPreload = [
      originalQueue[0], originalQueue[1],
      shuffledQueue[0], shuffledQueue[1]
    ].filter(Boolean);

    const uniqueTracks = tracksToPreload.filter((t, index, self) => 
      self.findIndex(s => s.id === t.id) === index && !audioCache.current[t.id]
    );

    uniqueTracks.forEach(track => {
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

  // EXPORT updateWindow so AudioContext can trigger it manually
  return { preloadContext, updateWindow }; 
};