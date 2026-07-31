import { useEffect } from 'react';

export const useMediaSession = (currentTrack, isPlaying, togglePlay, handlePrev, handleNext) => {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      
      // 1. Update the Lock Screen / OS Media Player
      if (currentTrack) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || 'Unknown Album',
        });
      }

      // 2. Bind hardware buttons (Earphones, Keyboards, Mobile Lock Screen)
      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  }, [currentTrack, isPlaying, togglePlay, handlePrev, handleNext]);
};