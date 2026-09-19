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

  // THE PRO ARCHITECTURE: Ping-Pong Audio Elements
  const audio1 = useRef(new Audio());
  const audio2 = useRef(new Audio());
  // activeAudioRef tracks which HTML element is currently the "live" one
  const activeAudioRef = useRef(audio1.current); 

  const abortControllerRef = useRef(null);
  const audioCache = useRef({}); 
  const isImperativePlayRef = useRef(false);
  const currentLoadedTrackIdRef = useRef(null);

  useTokenHeartbeat(userId, onTokenRefresh);

  const { 
    queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, 
    currentTrack, isShufflingRef, prepareContext, playContext, toggleShuffle, 
    toggleRepeat, syncActiveContext 
  } = useAudioQueue(audioCache);

  const { preloadContext, updateWindow } = useAudioCacheEngine(
    audioCache, driveToken, queue, currentIndex, repeatMode
  );

  const playTrackUrl = useCallback(async (track) => {
    if (!track || !driveToken || driveToken === 'undefined') return;

    if (currentLoadedTrackIdRef.current === track.id) return;
    currentLoadedTrackIdRef.current = track.id;
    dbg('playTrackUrl: lock acquired for', track.id);

    CacheEngine.incrementPlayCount(track.driveFileId);
    if (track.isFavourite || track.isFavorite) CacheEngine.cacheTrack(track, driveToken);

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      let localUrl = audioCache.current[track.id];

      // Fetch logic remains exactly the same
      if (!localUrl || localUrl === 'downloading') {
        let response = await CacheEngine.getCachedTrack(track.driveFileId);
        if (!response) {
          const MAX_ATTEMPTS = 3;
          let lastErr = null;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const timeoutController = new AbortController();
            const outerSignal = abortControllerRef.current.signal;
            const timeoutId = setTimeout(() => timeoutController.abort(), 8000);
            const onOuterAbort = () => timeoutController.abort();
            outerSignal.addEventListener('abort', onOuterAbort);

            try {
              response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`,
                { headers: { Authorization: `Bearer ${driveToken}` }, signal: timeoutController.signal }
              );
              clearTimeout(timeoutId);
              outerSignal.removeEventListener('abort', onOuterAbort);
              if (!response.ok) throw new Error("Google Drive API Error");
              lastErr = null;
              break;
            } catch (err) {
              clearTimeout(timeoutId);
              outerSignal.removeEventListener('abort', onOuterAbort);
              lastErr = err;
              if (outerSignal.aborted) throw err;
              if (attempt < MAX_ATTEMPTS) await new Promise(res => setTimeout(res, 1000 * attempt));
            }
          }
          if (lastErr) throw lastErr;
        }
        const blob = await response.blob();
        if (currentLoadedTrackIdRef.current !== track.id) return;
        localUrl = URL.createObjectURL(blob);
        audioCache.current[track.id] = localUrl; 
      }

      if (currentLoadedTrackIdRef.current !== track.id) return;

      // Update Metadata immediately in place (The lock screen survives!)
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
      }

      // IDENTIFY THE STANDBY AUDIO ELEMENT
      const standbyAudio = activeAudioRef.current === audio1.current ? audio2.current : audio1.current;
      
      // Load the new track into the standby element
      standbyAudio.src = localUrl;
      const playPromise = standbyAudio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // SUCCESS! The new track has secured Audio Focus. 
            // Now we gracefully shut down the old track.
            const oldAudio = activeAudioRef.current;
            
            // Swap the active reference to the new track FIRST, so our event 
            // listeners ignore the 'pause' event we are about to trigger on oldAudio.
            activeAudioRef.current = standbyAudio;
            
            oldAudio.pause();
            oldAudio.removeAttribute('src'); // Completely empty the old pipeline
            oldAudio.load(); 

            setIsPlaying(true);
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
          })
          .catch(e => {
            if (e.name !== 'AbortError') console.error("Playback interrupted:", e);
          });
      }

      const trackIdx = queue.findIndex(t => t.id === track.id);
      if (trackIdx !== -1) updateWindow(trackIdx);

    } catch (e) {
      if (e.name !== 'AbortError') setIsPlaying(false);
      if (currentLoadedTrackIdRef.current === track.id) currentLoadedTrackIdRef.current = null;
    }
  }, [driveToken, audioCache, queue, updateWindow]);


  // --- UI Controls ---
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    const audio = activeAudioRef.current;
    if (audio.paused) audio.play();
    else audio.pause();
  }, [currentTrack]);

  const handleNext = useCallback(() => {
    if (repeatMode === 'one') {
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current.play();
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
    if (activeAudioRef.current.currentTime > 3) {
      activeAudioRef.current.currentTime = 0; 
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

  // --- EVENT LISTENERS (Attached to BOTH audio elements) ---
  useEffect(() => {
    const handleEnded = (e) => {
      // Ignore ended events from the standby track (prevents ghost progression)
      if (e.target !== activeAudioRef.current) return; 
      
      const { currentIndex: cIdx, queue: q, repeatMode: rm } = latestStateRef.current;
      let nextIndex = -1;
      if (cIdx < q.length - 1) nextIndex = cIdx + 1;
      else if (rm === 'all') nextIndex = 0;

      if (nextIndex !== -1) {
        latestStateRef.current.currentIndex = nextIndex;
        isImperativePlayRef.current = true;
        setCurrentIndex(nextIndex); 
        playTrackUrl(q[nextIndex]);
      } else {
        setIsPlaying(false);
      }
    };

    const updateProgress = (e) => {
      if (e.target !== activeAudioRef.current) return;
      setProgress(e.target.currentTime);
    };
    
    const updateDuration = (e) => {
      if (e.target !== activeAudioRef.current) return;
      setDuration(e.target.duration);
    };
    
    const handlePlay = (e) => { 
      if (e.target !== activeAudioRef.current) return;
      setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    
    const handlePause = (e) => { 
      // Because we swap `activeAudioRef.current` BEFORE pausing the old track,
      // this beautifully ignores the pause event generated by track transitions!
      if (e.target !== activeAudioRef.current) return;
      
      const isNaturalEnd = e.target.duration > 0 && Math.abs(e.target.currentTime - e.target.duration) < 0.2;
      if (isNaturalEnd) return; 

      setIsPlaying(false); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };

    const a1 = audio1.current;
    const a2 = audio2.current;

    // Attach to both
    [a1, a2].forEach(a => {
      a.addEventListener('ended', handleEnded);
      a.addEventListener('timeupdate', updateProgress);
      a.addEventListener('loadedmetadata', updateDuration);
      a.addEventListener('play', handlePlay);
      a.addEventListener('pause', handlePause);
    });
    
    return () => {
      [a1, a2].forEach(a => {
        a.removeEventListener('ended', handleEnded);
        a.removeEventListener('timeupdate', updateProgress);
        a.removeEventListener('loadedmetadata', updateDuration);
        a.removeEventListener('play', handlePlay);
        a.removeEventListener('pause', handlePause);
      });
    };
  }, [playTrackUrl, setCurrentIndex]);

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
      playTrackUrl(queue[currentIndex]);
    }
  }, [currentIndex, queue, playTrackUrl, isShufflingRef]);

  // Sync settings to BOTH audio elements
  useEffect(() => {
    audio1.current.loop = repeatMode === 'one';
    audio2.current.loop = repeatMode === 'one';
  }, [repeatMode]);

  const seek = useCallback((time) => {
    activeAudioRef.current.currentTime = time;
    setProgress(time);
    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration, playbackRate: 1, position: time
        });
      } catch (e) {}
    }
  }, [duration]);

  const changeVolume = useCallback((newVolume) => {
    audio1.current.volume = newVolume;
    audio2.current.volume = newVolume;
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