// src/context/AudioContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { CacheEngine } from "../utils/CacheEngine";
import { useAudioQueue } from '../hooks/useAudioQueue';
import { useAudioCacheEngine } from '../hooks/useAudioCacheEngine';
import { useMediaSession } from '../hooks/useMediaSession';
import { authApi } from '../services/api';

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
  
  // Tracks if we manually started the next song to bypass React's delay
  const isImperativePlayRef = useRef(false);

  // ==========================================
  // JUST-IN-TIME BACKGROUND TOKEN REFRESH
  // ==========================================
  const lastTokenRefresh = useRef(Date.now() - (40 * 60 * 1000));
  const tokenRefreshPromiseRef = useRef(null);

  const getValidToken = useCallback(async () => {
    const timeSinceLastRefresh = Date.now() - lastTokenRefresh.current;
    const FORTY_FIVE_MINUTES = 45 * 60 * 1000;

    if (timeSinceLastRefresh > FORTY_FIVE_MINUTES) {
      // THE FIX: If a refresh is already in flight, wait for it. Do not fire another.
      if (tokenRefreshPromiseRef.current) {
        return await tokenRefreshPromiseRef.current;
      }

      try {
        console.log("🔄 Auth: Triggering Just-In-Time background refresh...");
        // Lock it!
        tokenRefreshPromiseRef.current = authApi.refreshToken(userId);
        const response = await tokenRefreshPromiseRef.current;
        const newToken = response.data.accessToken;
        
        localStorage.setItem('driveToken', newToken);
        if (onTokenRefresh) onTokenRefresh(newToken);
        
        lastTokenRefresh.current = Date.now();
        tokenRefreshPromiseRef.current = null; // Unlock
        return newToken;  
      } catch (error) {
        console.error("Background token refresh failed.", error);
        tokenRefreshPromiseRef.current = null;
        
        // If the backend says the token was revoked by Google, log the user out!
        if (error.response?.status === 401 && error.response?.data?.error === 'TOKEN_REVOKED') {
          console.error("User needs to re-authenticate.");
          localStorage.removeItem('driveToken');
          // Call your logout function here, or redirect to login screen
          window.location.href = '/login'; 
        }
        
        return driveToken; 
      }
    }
    return driveToken;
  }, [userId, driveToken, onTokenRefresh]);

  const { 
    queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, 
    currentTrack, isShufflingRef, prepareContext, playContext, toggleShuffle, 
    toggleRepeat, syncActiveContext 
  } = useAudioQueue(audioCache);

  // Pass getValidToken INSTEAD of driveToken to the cache engine
  const { preloadContext } = useAudioCacheEngine(
    audioCache, getValidToken, queue, currentIndex, repeatMode
  );

  const playTrackUrl = useCallback(async (track) => {
    if (!track) return;

    // THE FIX: Lock this specific run to its own abort controller
    const currentAbortController = new AbortController();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = currentAbortController;

    try {
      let localUrl = audioCache.current[track.id];

      // --- FAST PATH: Cache Hit ---
      if (localUrl && localUrl !== 'downloading') {
        if (audioRef.current) audioRef.current.pause();
        setProgress(0);
        setDuration(0);
        setIsPlaying(false);

        audioRef.current.src = localUrl;
        await audioRef.current.play();
        setIsPlaying(true);
        
        CacheEngine.incrementPlayCount(track.driveFileId);
        return; 
      }

      // --- SLOW PATH: Cache Miss ---
      const currentToken = await getValidToken();
      
      // THE FIX: Check if the user clicked "Next" while we were waiting for the token!
      if (currentAbortController.signal.aborted) return;
      
      if (!currentToken || currentToken === 'undefined') return;

      CacheEngine.incrementPlayCount(track.driveFileId);
      if (track.isFavourite || track.isFavorite) {
        CacheEngine.cacheTrack(track, currentToken);
      }

      let response = await CacheEngine.getCachedTrack(track.driveFileId);
      if (!response) {
        response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${track.driveFileId}?alt=media`, 
          {
            headers: { Authorization: `Bearer ${currentToken}` },
            signal: currentAbortController.signal // Use the locally scoped signal
          }
        );
        if (!response.ok) throw new Error("Google Drive API Error");
      }
      
      const blob = await response.blob();
      localUrl = URL.createObjectURL(blob);
      audioCache.current[track.id] = localUrl; 

      if (audioRef.current) audioRef.current.pause();
      setProgress(0);
      setDuration(0);
      setIsPlaying(false);

      audioRef.current.src = localUrl;
      await audioRef.current.play();
      setIsPlaying(true);

    } catch (e) {
      if (e.name !== 'AbortError') console.error("Playback failed:", e);
    }
  }, [getValidToken, audioCache]);

  // --- UI Controls ---
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