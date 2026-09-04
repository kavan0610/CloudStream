import { useEffect, useCallback, useRef } from 'react';

export const useAudioCacheEngine = (audioCache, getValidToken, queue, currentIndex, repeatMode) => {
  const abortControllers = useRef({});

  const getActiveWindowIds = useCallback(() => {
    if (currentIndex < 0 || queue.length === 0) return [];
    
    const ids = new Set([queue[currentIndex]?.id]);
    
    for (let i = 1; i <= 2; i++) {
      let nextIdx = currentIndex + i;
      if (nextIdx >= queue.length && repeatMode === 'all') nextIdx = nextIdx % queue.length;
      if (queue[nextIdx]) ids.add(queue[nextIdx].id);

      let prevIdx = currentIndex - i;
      if (prevIdx < 0 && repeatMode === 'all') prevIdx = (queue.length + prevIdx) % queue.length;
      if (queue[prevIdx]) ids.add(queue[prevIdx].id);
    }
    
    return Array.from(ids).filter(Boolean);
  }, [currentIndex, queue, repeatMode]);

  // GAPLESS PRELOADER
  useEffect(() => {
    if (currentIndex < 0 || queue.length === 0) return;

    const keepIds = getActiveWindowIds();

    // Clean up memory and abort network requests for old tracks
    Object.keys(audioCache.current).forEach(id => {
      if (!keepIds.includes(id)) {
        if (abortControllers.current[id]) {
          abortControllers.current[id].abort();
          delete abortControllers.current[id];
        }
        if (audioCache.current[id] && audioCache.current[id] !== 'downloading') {
          URL.revokeObjectURL(audioCache.current[id]); 
        }
        delete audioCache.current[id];
      }
    });

    // Download next tracks
    keepIds.forEach(async (id) => {
      if (!audioCache.current[id]) {
        const track = queue.find(t => t.id === id);
        if (!track) return;

        audioCache.current[id] = 'downloading'; 
        const controller = new AbortController();
        abortControllers.current[id] = controller;
        
        const currentToken = await getValidToken();
        if (!currentToken) return;
        
        fetch(`https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, {
          headers: { Authorization: `Bearer ${currentToken}` },
          signal: controller.signal
        })
        .then(res => res.ok ? res.blob() : Promise.reject('Failed'))
        .then(blob => {
          if (audioCache.current[id] === 'downloading') {
            audioCache.current[id] = URL.createObjectURL(blob);
          } else {
            const tempUrl = URL.createObjectURL(blob);
            URL.revokeObjectURL(tempUrl);
          }
          delete abortControllers.current[id];
        })
        .catch((err) => {
          if (err.name !== 'AbortError' && audioCache.current[id] === 'downloading') {
            delete audioCache.current[id];
          }
          delete abortControllers.current[id];
        });
      }
    });
  }, [currentIndex, queue, getActiveWindowIds, audioCache, getValidToken]);

  // SPECULATIVE PRELOADER
  const preloadContext = useCallback(async (originalQueue = [], shuffledQueue = []) => {
    if (!originalQueue || originalQueue.length === 0) return;

    const tracksToPreload = [
      originalQueue[0], originalQueue[1],
      shuffledQueue[0], shuffledQueue[1]
    ].filter(Boolean);

    const uniqueTracks = tracksToPreload.filter((t, index, self) => 
      self.findIndex(s => s.id === t.id) === index && !audioCache.current[t.id]
    );

    if (uniqueTracks.length === 0) return;

    const activeIds = getActiveWindowIds();
    const currentCacheKeys = Object.keys(audioCache.current);
    
    if (currentCacheKeys.length >= 6) {
      const speculativeKeys = currentCacheKeys.filter(key => !activeIds.includes(key));
      
      speculativeKeys.forEach(id => {
        if (abortControllers.current[id]) {
          abortControllers.current[id].abort();
          delete abortControllers.current[id];
        }
        if (audioCache.current[id] && audioCache.current[id] !== 'downloading') {
          URL.revokeObjectURL(audioCache.current[id]); 
        }
        delete audioCache.current[id];
      });
    }

    const currentToken = await getValidToken();
    if (!currentToken) return;

    uniqueTracks.forEach(track => {
      audioCache.current[track.id] = 'downloading'; 
      const controller = new AbortController();
      abortControllers.current[track.id] = controller;

      fetch(`https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        signal: controller.signal
      })
      .then(res => res.ok ? res.blob() : Promise.reject('Failed'))
      .then(blob => {
        if (audioCache.current[id] === 'downloading') {
          audioCache.current[id] = URL.createObjectURL(blob);
        } else {
          const tempUrl = URL.createObjectURL(blob);
          URL.revokeObjectURL(tempUrl);
        }
        delete abortControllers.current[id];
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && audioCache.current[track.id] === 'downloading') {
            delete audioCache.current[track.id];
        }
        delete abortControllers.current[track.id];
      });
    });
  }, [audioCache, getActiveWindowIds, getValidToken]);

  return { preloadContext };
};