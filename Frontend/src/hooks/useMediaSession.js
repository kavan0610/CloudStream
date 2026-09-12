// src/hooks/useMediaSession.js
import { useEffect } from 'react';

const dbg = (...args) => console.log('%c[MEDIASESSION]', 'color:#f0a;font-weight:bold', ...args);

export const useMediaSession = (currentTrack, isPlaying, togglePlay, handlePrev, handleNext, seek, duration, progress) => {

  // 1. Metadata & Hardware Buttons
  useEffect(() => {
    if ('mediaSession' in navigator) {
      
      if (currentTrack) {
        dbg('metadata set for', currentTrack.title, currentTrack.id);
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || 'Unknown Album',
          // Explicitly hand the OS a high-res image so it doesn't stretch your favicon
          artwork: [
            { src: '/icon.png', sizes: '256x256', type: 'image/png' },
            { src: '/icon.png', sizes: '512x512', type: 'image/png' }
          ]
        });
      } else {
        dbg('metadata effect ran but currentTrack is null');
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
        dbg('setPositionState THREW', e.message);
        console.warn("Could not set media position:", e);
      }
    }
  }, [duration, isPlaying]); 

  // 3. Playback State (tells the OS this tab is actively playing — keeps Chrome
  // from throttling/freezing it in the background)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      dbg('playbackState set to', navigator.mediaSession.playbackState, 'isPlaying=', isPlaying);
    }
  }, [isPlaying]);
};