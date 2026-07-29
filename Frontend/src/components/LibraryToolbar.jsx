import React, { useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

const LibraryToolbar = ({ folderName, searchQuery, setSearchQuery, tracks = [] }) => {
  const { playContext, preloadContext } = useAudio();

  useEffect(() => {
    if (tracks.length > 0) {
      preloadContext(tracks);
    }
  }, [tracks, preloadContext]);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-6 gap-4 mt-2 w-full">
      
      {/* Title Section */}
      <div className="w-full md:w-auto">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Your Library</h1>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
        
        {/* Search Bar: Full width on mobile, fixed 64 (256px) on desktop */}
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist or album..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        
        {/* Button Group: Splits 50/50 on mobile, natural size on desktop */}
        <div className="flex w-full md:w-auto gap-3">
          <button 
            onClick={() => tracks.length > 0 && playContext(tracks, 0, false)}
            disabled={tracks.length === 0}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-4 md:px-6 py-2 rounded-full font-semibold transition-all text-sm shadow-md"
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Play
          </button>
          
          <button 
            onClick={() => tracks.length > 0 && playContext(tracks, 0, true)}
            disabled={tracks.length === 0}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 text-white px-4 md:px-6 py-2 rounded-full font-semibold transition-all text-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg> Shuffle
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default LibraryToolbar;