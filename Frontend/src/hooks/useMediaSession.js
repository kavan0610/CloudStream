// src/hooks/useMediaSession.js
import { useEffect } from 'react';
import { debugLog } from '../utils/debugOverlay';

const dbg = (...args) => debugLog('MEDIASESSION', ...args);

export const useMediaSession = (currentTrack, isPlaying, togglePlay, handlePrev, handleNext, seek, duration, progress) => {

  // 1. Hardware Buttons & Lock Screen Actions
  // (Metadata assignment is handled synchronously in AudioContext to prevent drops)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      
      navigator.mediaSession.setActionHandler('play', () => {
        dbg('OS action: play pressed, isPlaying=', isPlaying);
        if (!isPlaying) togglePlay();
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        dbg('OS action: pause pressed, isPlaying=', isPlaying);
        if (isPlaying) togglePlay();
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        dbg('OS action: previoustrack pressed');
        handlePrev();
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        dbg('OS action: nexttrack pressed');
        handleNext();
      });
      
      // Allow the user to drag the timeline on the lock screen
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        dbg('OS action: seekto', details.seekTime);
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