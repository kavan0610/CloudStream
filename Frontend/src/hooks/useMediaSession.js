// src/hooks/useMediaSession.js
import { useEffect } from 'react';

export const useMediaSession = (currentTrack, isPlaying, togglePlay, handlePrev, handleNext, seek, duration, progress) => {

  // 1. Hardware Buttons & Lock Screen Actions
  // (Metadata assignment is handled synchronously in AudioContext to prevent drops)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      
      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) togglePlay();
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) togglePlay();
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrev();
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNext();
      });
      
      // Allow the user to drag the timeline on the lock screen
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [isPlaying, togglePlay, handlePrev, handleNext, seek]);

  // 2. Timeline & Progress Bar (Position State)
  useEffect(() => {
    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1, 
          position: 0 
        });
      } catch (e) {
        console.warn("Could not set media position:", e);
      }
    }
  }, [duration]);
  
  // 3. Playback State Sync
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);
};