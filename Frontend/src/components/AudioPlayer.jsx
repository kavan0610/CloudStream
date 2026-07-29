import React from 'react';
import { useAudio } from '../context/AudioContext';

const formatTime = (time) => {
  if (isNaN(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const AudioPlayer = () => {
  const { 
    currentTrack, isPlaying, progress, duration, volume, isShuffled, repeatMode,
    togglePlay, handleNext, handlePrev, seek, changeVolume, toggleShuffle, toggleRepeat
  } = useAudio();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between z-[100] animate-fade-in">
      
      {/* 1. Track Info */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white truncate text-sm">{currentTrack.title}</p>
          <p className="text-xs text-gray-400 truncate">{currentTrack.artist || 'Unknown Artist'}</p>
        </div>
      </div>

      {/* 2. Controls */}
      <div className="flex flex-col items-center flex-1 max-w-2xl px-4">
        <div className="flex items-center gap-6 mb-2">
          {/* Shuffle Button */}
          <button onClick={toggleShuffle} className={`transition-colors ${isShuffled ? 'text-emerald-500' : 'text-gray-400 hover:text-white'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          </button>

          <button onClick={handlePrev} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          
          <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all">
            {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          
          <button onClick={handleNext} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>

          {/* Repeat Button */}
          <button 
            onClick={toggleRepeat} 
            className={`relative flex items-center justify-center p-1 transition-colors ${
              repeatMode !== 'none' ? 'text-emerald-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            
            {/* Solid emerald circle with a dark '1' cutout */}
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[9px] font-black bg-emerald-500 text-[#0B0F19] w-3.5 h-3.5 flex items-center justify-center rounded-full shadow-sm">
                1
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full text-xs text-gray-400">
          <span>{formatTime(progress)}</span>
          <input type="range" min="0" max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer accent-white" />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Volume */}
      <div className="flex items-center gap-3 w-1/4 justify-end min-w-[150px]">
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} className="w-24 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer accent-white" />
      </div>
    </div>
  );
};

export default AudioPlayer;