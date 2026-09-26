// src/hooks/useMediaSession.js
import { useEffect } from 'react';
import { debugLog } from '../utils/debugOverlay';

const dbg = (...args) => debugLog('MEDIASESSION', ...args);

export const useMediaSession = (currentTrack, isPlaying, togglePlay, handlePrev, handleNext, seek, duration, progress) => {

  // 1. Metadata & Hardware Buttons
  // Metadata is set here, keyed off currentTrack state, decoupled from the
  // fetch/cache pipeline in AudioContext so it can never race with audio.src swaps.
  useEffect(() => {
    if ('mediaSession' in navigator) {

      if (currentTrack) {
        dbg('setting metadata for', currentTrack.id, currentTrack.title);
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || 'Unknown Album',
          artwork: [
            { src: '/icon.png', sizes: '256x256', type: 'image/png' },
            { src: '/icon.png', sizes: '512x512', type: 'image/png' }
          ]
        });
      }

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
  }, [currentTrack, isPlaying, togglePlay, handlePrev, handleNext, seek]);

  // 2. Timeline & Progress Bar (Position State)
  useEffect(() => {
    if ('mediaSession' in navigator && duration > 0 && progress >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: isPlaying ? 1 : 0,
          position: progress
        });
      } catch (e) {
        console.warn("Could not set media position:", e);
      }
    }
  }, [duration, isPlaying]);

  // 3. Playback State Sync
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);
};