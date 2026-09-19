// src/context/AudioContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { CacheEngine } from "../utils/CacheEngine";
import { useTokenHeartbeat } from '../hooks/useTokenHeartbeat';
import { useAudioQueue } from '../hooks/useAudioQueue';
import { useAudioCacheEngine } from '../hooks/useAudioCacheEngine';
import { useMediaSession } from '../hooks/useMediaSession';
import { debugLog } from '../utils/debugOverlay';

const dbg = (...args) => debugLog('AUDIO', ...args);

const AudioContext = createContext();
export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children, driveToken, userId, onTokenRefresh }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef(new Audio());
  const abortControllerRef = useRef(null);
  const audioCache = useRef({}); 
  
  const isImperativePlayRef = useRef(false);
  
  // THE FIX: Track when we are manually transitioning so we can ignore phantom pauses
  const isTransitioningRef = useRef(false);

  useTokenHeartbeat(userId, onTokenRefresh);

  const { 
    queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, 
    currentTrack, isShufflingRef, prepareContext, playContext, toggleShuffle, 
    toggleRepeat, syncActiveContext 
  } = useAudioQueue(audioCache);

  const { preloadContext, updateWindow } = useAudioCacheEngine(
    audioCache, driveToken, queue, currentIndex, repeatMode
  );

  const currentLoadedTrackIdRef = useRef(null);

  const playTrackUrl = useCallback(async (track) => {
    if (!track || !driveToken || driveToken === 'undefined') {
      dbg('playTrackUrl: bailed early', { hasTrack: !!track, driveToken });
      return;
    }

    dbg('playTrackUrl: called for', track.id, track.title);

    if (currentLoadedTrackIdRef.current === track.id) {
      dbg('playTrackUrl: BLOCKED by lock, already loaded', track.id);
      return;
    }
    currentLoadedTrackIdRef.current = track.id;
    dbg('playTrackUrl: lock acquired for', track.id);

    CacheEngine.incrementPlayCount(track.driveFileId);
    if (track.isFavourite || track.isFavorite) CacheEngine.cacheTrack(track, driveToken);

    try {
      if (abortControllerRef.current) {
        dbg('playTrackUrl: aborting previous controller');
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      let localUrl = audioCache.current[track.id];
      dbg('playTrackUrl: cache state for', track.id, '=', localUrl);

      if (!localUrl || localUrl === 'downloading') {
        dbg('playTrackUrl: no usable cached blob, fetching from Drive API', track.id);
        let response = await CacheEngine.getCachedTrack(track.driveFileId);
        dbg('playTrackUrl: CacheEngine.getCachedTrack returned', !!response);
        if (!response) {
          const MAX_ATTEMPTS = 3;
          const TIMEOUT_MS = 8000;
          let lastErr = null;

          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const timeoutController = new AbortController();
            const outerSignal = abortControllerRef.current.signal;
            const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
            const onOuterAbort = () => timeoutController.abort();
            outerSignal.addEventListener('abort', onOuterAbort);

            try {
              const fetchStart = Date.now();
              response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`,
                {
                  headers: { Authorization: `Bearer ${driveToken}` },
                  signal: timeoutController.signal,
                  priority: 'high' 
                }
              );
              clearTimeout(timeoutId);
              outerSignal.removeEventListener('abort', onOuterAbort);
              dbg('playTrackUrl: fetch resolved after', Date.now() - fetchStart, 'ms', {
                trackId: track.id, status: response.status, ok: response.ok,
                contentLength: response.headers.get('content-length')
              });
              if (!response.ok) throw new Error("Google Drive API Error: " + response.status);
              lastErr = null;
              break;
            } catch (err) {
              clearTimeout(timeoutId);
              outerSignal.removeEventListener('abort', onOuterAbort);
              lastErr = err;
              if (outerSignal.aborted) throw err;
              if (attempt < MAX_ATTEMPTS) {
                await new Promise(res => setTimeout(res, 1000 * attempt));
              }
            }
          }
          if (lastErr) throw lastErr;
        }
        const blob = await response.blob();
        
        if (currentLoadedTrackIdRef.current !== track.id) {
          dbg('playTrackUrl: track changed during fetch, discarding blob for', track.id);
          return; 
        }

        dbg('playTrackUrl: blob created', {
          trackId: track.id, size: blob.size, type: blob.type,
          expectedContentLength: response.headers.get('content-length')
        });
        localUrl = URL.createObjectURL(blob);
        audioCache.current[track.id] = localUrl; 
      } else {
        dbg('playTrackUrl: using already-cached blob URL for', track.id);
      }

      if (currentLoadedTrackIdRef.current !== track.id) return;

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: track.title,
          artist: track.artist || 'Unknown Artist',
          album: track.album || 'Unknown Album',
          artwork: [
            { src: `${window.location.origin}/icon.png`, sizes: '256x256', type: 'image/png' },
            { src: `${window.location.origin}/icon.png`, sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';
      }

      // Tell event listeners to ignore the pause that happens when changing the src
      isTransitioningRef.current = true;

      dbg('playTrackUrl: setting audio.src for track', track.id, 'src=', localUrl);
      
      // 1. Set the source
      audioRef.current.src = localUrl;
      
      // 2. Call play synchronously
      const playPromise = audioRef.current.play();
      
      // 3. SYNCHRONOUSLY set the metadata BEFORE the function ends.
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: track.title,
          artist: track.artist || 'Unknown Artist',
          album: track.album || 'Unknown Album',
          artwork: [
            { src: `${window.location.origin}/icon.png`, sizes: '256x256', type: 'image/png' },
            { src: `${window.location.origin}/icon.png`, sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';
      }

      // 4. Handle the promise strictly for error logging and transition state
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isTransitioningRef.current = false;
            dbg('playTrackUrl: play() promise RESOLVED for', track.id);
          })
          .catch(e => {
            isTransitioningRef.current = false;
            dbg('playTrackUrl: play() promise REJECTED for', track.id, e.name, e.message);
            if (e.name !== 'AbortError') console.error("Playback interrupted:", e);
          });
      } else {
        isTransitioningRef.current = false;
      }

      const trackIdx = queue.findIndex(t => t.id === track.id);
      if (trackIdx !== -1) {
        dbg('playTrackUrl: calling updateWindow for index', trackIdx);
        updateWindow(trackIdx);
      }

    } catch (e) {
      dbg('playTrackUrl: CAUGHT ERROR for', track.id, e.name, e.message);
      if (e.name !== 'AbortError') {
        console.error("Playback failed:", e);
        setIsPlaying(false);
      }
      if (currentLoadedTrackIdRef.current === track.id) {
        dbg('playTrackUrl: releasing lock for', track.id);
        currentLoadedTrackIdRef.current = null;
      }
    }
  }, [driveToken, audioCache, queue, updateWindow]);


  // --- UI Controls ---
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    dbg('togglePlay called, audio.paused=', audioRef.current.paused);
    if (audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  }, [currentTrack]);

  const handleNext = useCallback(() => {
    dbg('handleNext called', { currentIndex, repeatMode });
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    let nextIndex = -1;
    if (currentIndex < queue.length - 1) nextIndex = currentIndex + 1;
    else if (repeatMode === 'all') nextIndex = 0;

    if (nextIndex !== -1) {
      isImperativePlayRef.current = true;
      setCurrentIndex(nextIndex);
      playTrackUrl(queue[nextIndex]);
    }
  }, [currentIndex, queue, repeatMode, setCurrentIndex, playTrackUrl]);

  const handlePrev = useCallback(() => {
    dbg('handlePrev called', { currentIndex, currentTime: audioRef.current.currentTime });
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0; 
    } else {
      let prevIndex = -1;
      if (currentIndex > 0) prevIndex = currentIndex - 1;
      else if (repeatMode === 'all') prevIndex = queue.length - 1;

      if (prevIndex !== -1) {
        isImperativePlayRef.current = true;
        setCurrentIndex(prevIndex);
        playTrackUrl(queue[prevIndex]);
      }
    }
  }, [currentIndex, queue, repeatMode, setCurrentIndex, playTrackUrl]);

  const latestStateRef = useRef({ currentIndex, queue, repeatMode });
  
  useEffect(() => {
    latestStateRef.current = { currentIndex, queue, repeatMode };
  }, [currentIndex, queue, repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      dbg('AUDIO EVENT: ended fired', { currentTime: audio.currentTime, duration: audio.duration });
      const { currentIndex: cIdx, queue: q, repeatMode: rm } = latestStateRef.current;
      
      let nextIndex = -1;
      if (cIdx < q.length - 1) nextIndex = cIdx + 1;
      else if (rm === 'all') nextIndex = 0;

      dbg('handleEnded: advancing from', cIdx, 'to', nextIndex);

      if (nextIndex !== -1) {
        latestStateRef.current.currentIndex = nextIndex;
        isImperativePlayRef.current = true;
        setCurrentIndex(nextIndex); 
        playTrackUrl(q[nextIndex]);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [playTrackUrl, setCurrentIndex]);


  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    const handlePlay = () => { 
      dbg('AUDIO EVENT: play (native)'); 
      setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    
    // THE ULTIMATE FIX: Intercept the phantom pause
    const handlePause = () => { 
      // 1. Did the track end naturally? (currentTime is within 0.2s of duration)
      const isNaturalEnd = audio.duration > 0 && Math.abs(audio.currentTime - audio.duration) < 0.2;
      
      if (isNaturalEnd || isTransitioningRef.current) {
        dbg('AUDIO EVENT: pause (native) IGNORED - track transitioning');
        return; 
      }

      dbg('AUDIO EVENT: pause (native)', 'currentTime=', audio.currentTime); 
      setIsPlaying(false); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const evts = ['error', 'stalled', 'waiting', 'suspend', 'abort', 'emptied', 'canplay', 'canplaythrough', 'loadstart', 'loadeddata', 'playing'];
    const handlers = {};
    evts.forEach(evt => {
      handlers[evt] = () => {
        if (evt === 'error') {
          dbg('AUDIO EVENT: error', { code: audio.error?.code, message: audio.error?.message, src: audio.src?.slice(0, 60) });
        } else {
          dbg('AUDIO EVENT:', evt, 'readyState=', audio.readyState, 'networkState=', audio.networkState);
        }
      };
      audio.addEventListener(evt, handlers[evt]);
    });
    return () => evts.forEach(evt => audio.removeEventListener(evt, handlers[evt]));
  }, []);

  useEffect(() => {
    const onVis = () => dbg('VISIBILITY CHANGE:', document.visibilityState, 'hidden=', document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (isShufflingRef.current) {
      isShufflingRef.current = false;
      return;
    }
    if (currentIndex >= 0 && queue[currentIndex]) {
      if (isImperativePlayRef.current) {
        isImperativePlayRef.current = false;
        return;
      }
      dbg('currentIndex effect: triggering playTrackUrl (fallback path) for index', currentIndex);
      playTrackUrl(queue[currentIndex]);
    }
  }, [currentIndex, queue, playTrackUrl, isShufflingRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = repeatMode === 'one'; 
    }
  }, [repeatMode]);

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
    
    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1, 
          position: time
        });
      } catch (e) {
        console.warn("Could not sync seek position with OS:", e);
      }
    }
  }, [duration]);

  const changeVolume = useCallback((newVolume) => {
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  }, []);

  useMediaSession(currentTrack, isPlaying, togglePlay, handlePrev, handleNext, seek, duration, progress);

  return (
    <AudioContext.Provider value={{
      currentTrack, isPlaying, progress, duration, volume, isShuffled, repeatMode,
      prepareContext, playContext, togglePlay, handleNext, handlePrev, seek, changeVolume, toggleShuffle, toggleRepeat, preloadContext, syncActiveContext
    }}>
      {children}
    </AudioContext.Provider>
  );
};