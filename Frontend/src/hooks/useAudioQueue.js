import { useState, useRef, useCallback } from 'react';

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useAudioQueue = (audioCache) => {
  const [contextTracks, setContextTracks] = useState([]); 
  const [queue, setQueue] = useState([]);                
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none');
  const isShufflingRef = useRef(false);

  const currentTrack = queue[currentIndex] || null;

  const playContext = useCallback((tracks, startIndex = 0, startShuffled = false) => {
    setContextTracks(tracks);
    setIsShuffled(startShuffled);

    if (startShuffled) {
      let shuffled = shuffleArray(tracks);
      const cachedTrack = shuffled.find(t => 
        audioCache.current[t.id] && audioCache.current[t.id] !== 'downloading'
      );

      if (cachedTrack) {
        shuffled = shuffled.filter(t => t.id !== cachedTrack.id);
        shuffled.unshift(cachedTrack);
      }

      setQueue(shuffled);
      setCurrentIndex(0);
    } else {
      setQueue(tracks);
      setCurrentIndex(startIndex);
    }
  }, [audioCache]);

  const toggleShuffle = useCallback(() => {
    if (!currentTrack) return;
    isShufflingRef.current = true;

    if (!isShuffled) {
      const remainingTracks = contextTracks.filter(t => t.id !== currentTrack.id);
      const shuffledRemaining = shuffleArray(remainingTracks);
      setQueue([currentTrack, ...shuffledRemaining]);
      setCurrentIndex(0);
      setIsShuffled(true);
    } else {
      setQueue(contextTracks);
      const originalIndex = contextTracks.findIndex(t => t.id === currentTrack.id);
      setCurrentIndex(originalIndex !== -1 ? originalIndex : 0);
      setIsShuffled(false);
    }
  }, [currentTrack, contextTracks, isShuffled]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  const syncActiveContext = useCallback((updatedTracks) => {
    setContextTracks(updatedTracks);
    
    if (currentIndex === -1 || !queue[currentIndex]) {
      if (isShuffled) setQueue(shuffleArray(updatedTracks));
      else setQueue(updatedTracks);
      return;
    }

    const playingTrack = queue[currentIndex];
    isShufflingRef.current = true; 

    if (!isShuffled) {
      setQueue(updatedTracks);
      const newIndex = updatedTracks.findIndex(t => t.id === playingTrack.id);
      if (newIndex !== -1) setCurrentIndex(newIndex);
    } else {
      const updatedTrackIds = new Set(updatedTracks.map(t => t.id));
      const filteredQueue = queue.filter(t => updatedTrackIds.has(t.id) || t.id === playingTrack.id);
      const oldQueueIds = new Set(queue.map(t => t.id));
      const newTracks = updatedTracks.filter(t => !oldQueueIds.has(t.id));
      
      const shuffledNew = shuffleArray(newTracks);
      const finalQueue = [...filteredQueue];
      const currentTrackNewIndex = finalQueue.findIndex(t => t.id === playingTrack.id);
      
      shuffledNew.forEach(newTrack => {
         const min = currentTrackNewIndex + 1;
         const max = finalQueue.length;
         const randomInsertIndex = Math.floor(Math.random() * (max - min + 1)) + min;
         finalQueue.splice(randomInsertIndex, 0, newTrack);
      });

      setQueue(finalQueue);
      if (currentTrackNewIndex !== -1) setCurrentIndex(currentTrackNewIndex);
    }
  }, [currentIndex, queue, isShuffled]);

  return {
    queue, currentIndex, setCurrentIndex, isShuffled, repeatMode, currentTrack, isShufflingRef,
    playContext, toggleShuffle, toggleRepeat, syncActiveContext
  };
};