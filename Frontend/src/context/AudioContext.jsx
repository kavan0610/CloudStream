// // src/context/AudioContext.jsx
// import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
// import { CacheEngine } from "../utils/CacheEngine";
// import { useTokenHeartbeat } from '../hooks/useTokenHeartbeat';
// import { useAudioQueue } from '../hooks/useAudioQueue';
// import { useAudioCacheEngine } from '../hooks/useAudioCacheEngine';

// const AudioContext = createContext();
// export const useAudio = () => useContext(AudioContext);

// export const AudioProvider = ({ children, driveToken, userId, onTokenRefresh }) => {
//   // 1. Hardware State
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [volume, setVolume] = useState(1);

//   const audioRef = useRef(new Audio());
//   const abortControllerRef = useRef(null);
  
//   // THE FIX: Lift the cache memory to the top level!
//   const audioCache = useRef({}); 

//   // 2. Auth Heartbeat
//   useTokenHeartbeat(userId, onTokenRefresh);

//   // 3. Queue Management Engine (Pass cache in)
//   const { 
//     queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, 
//     currentTrack, isShufflingRef, prepareContext, playContext, toggleShuffle, 
//     toggleRepeat, syncActiveContext 
//   } = useAudioQueue(audioCache);

//   // 4. Cache Engine (Pass cache and queue in)
//   const { preloadContext } = useAudioCacheEngine(
//     audioCache, driveToken, queue, currentIndex, repeatMode
//   );

//   // --- HTML5 Audio Setup ---
//   useEffect(() => {
//     const audio = audioRef.current;
//     const updateProgress = () => setProgress(audio.currentTime);
//     const updateDuration = () => setDuration(audio.duration);
//     const handlePlay = () => setIsPlaying(true);
//     const handlePause = () => setIsPlaying(false);
    
//     audio.addEventListener('timeupdate', updateProgress);
//     audio.addEventListener('loadedmetadata', updateDuration);
//     audio.addEventListener('play', handlePlay);
//     audio.addEventListener('pause', handlePause);
    
//     return () => {
//       audio.removeEventListener('timeupdate', updateProgress);
//       audio.removeEventListener('loadedmetadata', updateDuration);
//       audio.removeEventListener('play', handlePlay);
//       audio.removeEventListener('pause', handlePause);
//     };
//   }, []);

//   const playTrackUrl = useCallback(async (track) => {
//     if (!track || !driveToken || driveToken === 'undefined') return;

//     CacheEngine.incrementPlayCount(track.driveFileId);
//     if (track.isFavourite || track.isFavorite) {
//       CacheEngine.cacheTrack(track, driveToken);
//     }

//     try {
//       if (audioRef.current) audioRef.current.pause();
//       setProgress(0);
//       setDuration(0);
//       setIsPlaying(false);

//       if (abortControllerRef.current) abortControllerRef.current.abort();
//       abortControllerRef.current = new AbortController();

//       let localUrl = audioCache.current[track.id];

//       if (!localUrl || localUrl === 'downloading') {
//         let response = await CacheEngine.getCachedTrack(track.driveFileId);
//         if (!response) {
//           response = await fetch(
//             `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, 
//             {
//               headers: { Authorization: `Bearer ${driveToken}` },
//               signal: abortControllerRef.current.signal
//             }
//           );
//           if (!response.ok) throw new Error("Google Drive API Error");
//         }
//         const blob = await response.blob();
//         localUrl = URL.createObjectURL(blob);
//         audioCache.current[track.id] = localUrl; 
//       }

//       audioRef.current.src = localUrl;
//       await audioRef.current.play();
//       setIsPlaying(true);
//     } catch (e) {
//       if (e.name !== 'AbortError') console.error("Playback failed:", e);
//     }
//   }, [driveToken, audioCache]);

//   // Handle Track Endings
//   useEffect(() => {
//     const audio = audioRef.current;
//     const handleEnded = () => {
//       if (currentIndex < queue.length - 1) {
//         setCurrentIndex(prev => prev + 1);
//       } else {
//         if (repeatMode === 'all') setCurrentIndex(0); 
//         else setIsPlaying(false); 
//       }
//     };
//     audio.addEventListener('ended', handleEnded);
//     return () => audio.removeEventListener('ended', handleEnded);
//   }, [currentIndex, queue.length, repeatMode, setCurrentIndex]);

//   // Track changes trigger playback
//   useEffect(() => {
//     if (isShufflingRef.current) {
//       isShufflingRef.current = false;
//       return;
//     }
//     if (currentIndex >= 0 && queue[currentIndex]) {
//       playTrackUrl(queue[currentIndex]);
//     }
//   }, [currentIndex, queue, playTrackUrl, isShufflingRef]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.loop = repeatMode === 'one'; 
//     }
//   }, [repeatMode]);

//   // --- UI Controls ---
//   const togglePlay = () => {
//     if (!currentTrack) return;
//     if (audioRef.current.paused) audioRef.current.play();
//     else audioRef.current.pause();
//   };

//   const handleNext = () => {
//     if (repeatMode === 'one') {
//       audioRef.current.currentTime = 0;
//       audioRef.current.play();
//       return;
//     }
//     if (currentIndex < queue.length - 1) setCurrentIndex(prev => prev + 1);
//     else if (repeatMode === 'all') setCurrentIndex(0); 
//   };

//   const handlePrev = () => {
//     if (audioRef.current.currentTime > 3) {
//       audioRef.current.currentTime = 0; 
//     } else if (currentIndex > 0) {
//       setCurrentIndex(prev => prev - 1);
//     } else if (repeatMode === 'all') {
//       setCurrentIndex(queue.length - 1); 
//     }
//   };

//   const seek = (time) => {
//     audioRef.current.currentTime = time;
//     setProgress(time);
//   };

//   const changeVolume = (newVolume) => {
//     audioRef.current.volume = newVolume;
//     setVolume(newVolume);
//   };

//   return (
//     <AudioContext.Provider value={{
//       currentTrack, isPlaying, progress, duration, volume, isShuffled, repeatMode,
//       prepareContext, playContext, togglePlay, handleNext, handlePrev, seek, changeVolume, toggleShuffle, toggleRepeat, preloadContext, syncActiveContext
//     }}>
//       {children}
//     </AudioContext.Provider>
//   );
// };
// src/context/AudioContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { CacheEngine } from "../utils/CacheEngine";
import { useTokenHeartbeat } from '../hooks/useTokenHeartbeat';
import { useAudioQueue } from '../hooks/useAudioQueue';
import { useAudioCacheEngine } from '../hooks/useAudioCacheEngine';
import { useMediaSession } from '../hooks/useMediaSession';

const AudioContext = createContext();
export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children, driveToken, userId, onTokenRefresh }) => {
  // 1. Hardware State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef(new Audio());
  const abortControllerRef = useRef(null);
  
  const audioCache = useRef({}); 

  // Auth Heartbeat
  useTokenHeartbeat(userId, onTokenRefresh);

  // Queue Management Engine (Pass cache in)
  const { 
    queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, 
    currentTrack, isShufflingRef, prepareContext, playContext, toggleShuffle, 
    toggleRepeat, syncActiveContext 
  } = useAudioQueue(audioCache);

  // Cache Engine (Pass cache and queue in)
  const { preloadContext } = useAudioCacheEngine(
    audioCache, driveToken, queue, currentIndex, repeatMode
  );

  // --- HTML5 Audio Setup ---
  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
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

  const playTrackUrl = useCallback(async (track) => {
    if (!track || !driveToken || driveToken === 'undefined') return;

    CacheEngine.incrementPlayCount(track.driveFileId);
    if (track.isFavourite || track.isFavorite) {
      CacheEngine.cacheTrack(track, driveToken);
    }

    try {
      if (audioRef.current) audioRef.current.pause();
      setProgress(0);
      setDuration(0);
      setIsPlaying(false);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      let localUrl = audioCache.current[track.id];

      if (!localUrl || localUrl === 'downloading') {
        let response = await CacheEngine.getCachedTrack(track.driveFileId);
        if (!response) {
          response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, 
            {
              headers: { Authorization: `Bearer ${driveToken}` },
              signal: abortControllerRef.current.signal
            }
          );
          if (!response.ok) throw new Error("Google Drive API Error");
        }
        const blob = await response.blob();
        localUrl = URL.createObjectURL(blob);
        audioCache.current[track.id] = localUrl; 
      }

      audioRef.current.src = localUrl;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (e) {
      if (e.name !== 'AbortError') console.error("Playback failed:", e);
    }
  }, [driveToken, audioCache]);

  // Handle Track Endings
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        if (repeatMode === 'all') setCurrentIndex(0); 
        else setIsPlaying(false); 
      }
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentIndex, queue.length, repeatMode, setCurrentIndex]);

  // Track changes trigger playback
  useEffect(() => {
    if (isShufflingRef.current) {
      isShufflingRef.current = false;
      return;
    }
    if (currentIndex >= 0 && queue[currentIndex]) {
      playTrackUrl(queue[currentIndex]);
    }
  }, [currentIndex, queue, playTrackUrl, isShufflingRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = repeatMode === 'one'; 
    }
  }, [repeatMode]);

  // --- UI Controls ---
  // Wrapped in useCallback to prevent endless re-renders when passed to the hook
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (audioRef.current.paused) audioRef.current.play();
    else audioRef.current.pause();
  }, [currentTrack]);

  const handleNext = useCallback(() => {
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    if (currentIndex < queue.length - 1) setCurrentIndex(prev => prev + 1);
    else if (repeatMode === 'all') setCurrentIndex(0); 
  }, [currentIndex, queue.length, repeatMode, setCurrentIndex]);

  const handlePrev = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0; 
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (repeatMode === 'all') {
      setCurrentIndex(queue.length - 1); 
    }
  }, [currentIndex, queue.length, repeatMode, setCurrentIndex]);

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const changeVolume = (newVolume) => {
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  // --- Fire up the Media Session hook! ---
  useMediaSession(currentTrack, isPlaying, togglePlay, handlePrev, handleNext);

  return (
    <AudioContext.Provider value={{
      currentTrack, isPlaying, progress, duration, volume, isShuffled, repeatMode,
      prepareContext, playContext, togglePlay, handleNext, handlePrev, seek, changeVolume, toggleShuffle, toggleRepeat, preloadContext, syncActiveContext
    }}>
      {children}
    </AudioContext.Provider>
  );
};