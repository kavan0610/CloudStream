import { useEffect, useCallback } from 'react';

const dbg = (...args) => console.log('%c[CACHE]', 'color:#fa0;font-weight:bold', ...args);

export const useAudioCacheEngine = (audioCache, driveToken, queue, currentIndex, repeatMode) => {

  const fetchTrackWithRetry = useCallback((track, attempt = 1) => {
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = 1000; // 1s, 2s, 4s

    dbg('prefetch: starting fetch for', track.id, 'attempt', attempt);
    const start = Date.now();

    fetch(`https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, {
      headers: { Authorization: `Bearer ${driveToken}` }
    })
    .then(res => {
      dbg('prefetch: response for', track.id, {
        status: res.status,
        ok: res.ok,
        ms: Date.now() - start,
        contentLength: res.headers.get('content-length')
      });
      return res.ok ? res.blob() : Promise.reject('Failed status ' + res.status);
    })
    .then(blob => {
      dbg('prefetch: blob ready for', track.id, 'size=', blob.size);
      if (audioCache.current[track.id] === 'downloading') {
        audioCache.current[track.id] = URL.createObjectURL(blob);
        dbg('prefetch: cached blob URL for', track.id);
      } else {
        dbg('prefetch: slot no longer downloading, discarding blob for', track.id, 'current value=', audioCache.current[track.id]);
      }
    })
    .catch((err) => {
      dbg('prefetch: FAILED for', track.id, 'attempt', attempt, err);
      if (audioCache.current[track.id] !== 'downloading') {
        dbg('prefetch: slot changed during failure, not retrying', track.id);
        return;
      }
      if (attempt < MAX_ATTEMPTS) {
        setTimeout(() => fetchTrackWithRetry(track, attempt + 1), BACKOFF_MS * attempt);
      } else {
        dbg('prefetch: giving up on', track.id, 'after', MAX_ATTEMPTS, 'attempts');
        delete audioCache.current[track.id];
      }
    });
  }, [driveToken, audioCache]);

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

    dbg('updateWindow: called for index', targetIndex, {
      keepIds,
      existingCacheKeys: Object.keys(audioCache.current)
    });

    Object.keys(audioCache.current).forEach(id => {
      if (!keepIds.includes(id)) {
        if (audioCache.current[id] && audioCache.current[id] !== 'downloading') {
          URL.revokeObjectURL(audioCache.current[id]); 
        }
        dbg('updateWindow: evicting from cache', id);
        delete audioCache.current[id];
      }
    });

    tracksToKeepReady.forEach(track => {
      if (!audioCache.current[track.id]) {
        audioCache.current[track.id] = 'downloading'; 
        fetchTrackWithRetry(track);
      }
    });
  }, [queue, driveToken, repeatMode, audioCache, fetchTrackWithRetry]);

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

    dbg('preloadContext: preloading', uniqueTracks.map(t => t.id));

    uniqueTracks.forEach(track => {
      audioCache.current[track.id] = 'downloading'; 
      fetch(`https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, {
        headers: { Authorization: `Bearer ${driveToken}` }
      })
      .then(res => res.ok ? res.blob() : Promise.reject('Failed'))
      .then(blob => {
        dbg('preloadContext: blob ready for', track.id, 'size=', blob.size);
        if (audioCache.current[track.id] === 'downloading') {
          audioCache.current[track.id] = URL.createObjectURL(blob);
        }
      })
      .catch((err) => {
        dbg('preloadContext: FAILED for', track.id, err);
        if (audioCache.current[track.id] === 'downloading') delete audioCache.current[track.id];
      });
    });
  }, [driveToken, audioCache]);

  // EXPORT updateWindow so AudioContext can trigger it manually
  return { preloadContext, updateWindow }; 
};