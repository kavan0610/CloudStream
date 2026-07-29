import React, { useRef, useState, useEffect } from 'react';

const PlaylistRow = ({ playlists = [], onCreateClick, onPlaylistClick, onEditClick, onDeleteClick, onFavoritesClick }) => {
  const scrollContainerRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close the dropdown if the user clicks anywhere outside of it
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -350 : 350, behavior: 'smooth' });
    }
  };

  const dbFavoritesPlaylist = playlists.find(p => 
    p.name.toLowerCase() === 'favorites'
  );

  return (
    <div className="mb-4 mt-4">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Playlists</h1>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onCreateClick} className="flex items-center gap-1.5 md:gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-full font-semibold transition-all text-xs md:text-sm shadow-md">
            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Create <span className="hidden sm:inline">Playlist</span>
          </button>
          
          {/* Hide scroll arrows on mobile, users will just swipe */}
          <div className="hidden md:flex gap-2">
            <button onClick={() => scroll('left')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
            <button onClick={() => scroll('right')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
          </div>
        </div>
      </div>
      
      {/* Reduced gap on mobile */}
      <div ref={scrollContainerRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {/* THE HARDCODED FAVORITES BOX - NOW CLICKABLE */}
        <div 
          onClick={onFavoritesClick}
          className="min-w-[130px] md:min-w-[180px] h-36 md:h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-end cursor-pointer transition-all relative overflow-hidden group"
        >
          <div className="absolute top-2 right-2 md:top-4 md:right-4 text-white/40 group-hover:text-yellow-400 transition-colors">
            <svg className="w-5 h-5 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          </div>
          <h3 className="font-bold text-base md:text-xl text-white">Favorites</h3>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">Starred</p>
        </div>

        {/* MAP OVER USER PLAYLISTS - IGNORING THE DB FAVORITES ONE */}
        {playlists
          .filter(playlist => playlist.name.toLowerCase() !== 'favorites' && playlist.name.toLowerCase() !== 'favourites')
          .map(playlist => (
          <div key={playlist.id} onClick={() => onPlaylistClick(playlist.id)} className={`min-w-[130px] md:min-w-[180px] h-36 md:h-48 ${playlist.coverImage} border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-end cursor-pointer transition-all relative overflow-hidden group hover:scale-[1.02]`}>
            
            {/* THE 3-DOTS MENU BUTTON */}
            <div className="absolute top-2 right-2 md:top-3 md:right-3 z-10">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setOpenMenuId(openMenuId === playlist.id ? null : playlist.id); 
                }} 
                className="p-1 md:p-1.5 bg-black/20 hover:bg-black/50 rounded-full text-white shadow-sm backdrop-blur-md transition-all"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
              </button>

              {/* THE DROPDOWN */}
              {openMenuId === playlist.id && (
                <div className="absolute right-0 mt-2 w-32 bg-[#1A2235] border border-white/10 rounded-xl shadow-2xl py-1 z-20 overflow-hidden animate-fade-in">
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onEditClick(playlist); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDeleteClick(playlist.id); }} className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Delete
                  </button>
                </div>
              )}
            </div>

            <h3 className="font-bold text-base md:text-xl text-white truncate md:whitespace-normal md:line-clamp-2">{playlist.name}</h3>
            <p className="text-[10px] md:text-xs text-white/70 mt-0.5 md:mt-1">Playlist</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistRow;