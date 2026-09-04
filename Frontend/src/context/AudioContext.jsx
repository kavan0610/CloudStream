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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef(new Audio());
  const abortControllerRef = useRef(null);
  const audioCache = useRef({}); 
  
  // THE FIX: This tracks if we manually started the next song to bypass React's delay
  const isImperativePlayRef = useRef(false);

  useTokenHeartbeat(userId, onTokenRefresh);

  const { 
    queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, 
    currentTrack, isShufflingRef, prepareContext, playContext, toggleShuffle, 
    toggleRepeat, syncActiveContext 
  } = useAudioQueue(audioCache);

  const { preloadContext } = useAudioCacheEngine(
    audioCache, driveToken, queue, currentIndex, repeatMode
  );

  const playTrackUrl = useCallback(async (track) => {
    if (!track || !driveToken || driveToken === 'undefined') return;

    CacheEngine.incrementPlayCount(track.driveFileId);
    if (track.isFavourite || track.isFavorite) CacheEngine.cacheTrack(track, driveToken);

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


  // --- UI Controls (Updated for Background Resilience) ---
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

  // Handle Track Endings
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      let nextIndex = -1;
      if (currentIndex < queue.length - 1) nextIndex = currentIndex + 1;
      else if (repeatMode === 'all') nextIndex = 0;

      if (nextIndex !== -1) {
        isImperativePlayRef.current = true;
        setCurrentIndex(nextIndex);
        playTrackUrl(queue[nextIndex]);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentIndex, queue, repeatMode, setCurrentIndex, playTrackUrl]);

  // Handle HTML5 Events
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

  // Track changes trigger playback (Fallback for UI clicks)
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = repeatMode === 'one'; 
    }
  }, [repeatMode]);

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const changeVolume = (newVolume) => {
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

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