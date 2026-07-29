import React from 'react';
import { formatDuration } from '../utils/formatters';
import { useAudio } from '../context/AudioContext';

const TrackTable = ({ tracks, loading, isAddMode = false, selectedIds = [], onToggleAdd, showStar = true, onToggleFavorite }) => {
  const { playContext, currentTrack } = useAudio();

  if (loading) {
    return <div className="flex justify-center py-24 text-gray-500 animate-pulse">Loading audio references...</div>;
  }

  if (tracks.length === 0) {
    return <div className="flex justify-center py-24 text-gray-500 text-sm">No tracks found.</div>;
  }

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-2xl md:rounded-3xl overflow-hidden backdrop-blur-sm mb-12">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-xs text-gray-500 uppercase tracking-widest font-mono">
            {/* Reduced padding on mobile, dynamic width */}
            <th className="p-3 md:p-5 font-semibold w-auto md:w-1/3">Title</th>
            {/* Hidden on mobile */}
            <th className="p-3 md:p-5 font-semibold w-1/4 hidden md:table-cell">Artist</th>
            {/* Hidden on tablets and mobile */}
            <th className="p-3 md:p-5 font-semibold w-1/5 hidden lg:table-cell">Album</th>
            <th className="p-3 md:p-5 font-semibold text-right">Time</th>
            <th className="p-3 md:p-5 text-right font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-sm">
          {tracks.map((track) => (
            <tr 
              key={track.id} 
              onClick={() => !isAddMode && playContext(tracks, tracks.findIndex(t => t.id === track.id))} 
              className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
            >
              <td className="p-3 md:p-5">
                {/* Title: Restricted max width on mobile so it doesn't break layout */}
                <div 
                  className={`font-medium truncate max-w-[140px] sm:max-w-[200px] md:max-w-[250px] ${currentTrack?.id === track.id ? 'text-emerald-500' : 'text-white'}`} 
                  title={track.title}
                >
                  {track.title}
                </div>
                {/* Mobile-Only Artist: Shows up under the title exclusively on small screens */}
                <div className="text-xs text-gray-400 truncate max-w-[140px] mt-1 md:hidden" title={track.artist || 'Unknown Artist'}>
                  {track.artist || 'Unknown Artist'}
                </div>
              </td>
              
              {/* Desktop Artist Column (Hidden on Mobile) */}
              <td className="p-3 md:p-5 text-gray-400 truncate max-w-[200px] hidden md:table-cell" title={track.artist || 'Unknown Artist'}>
                {track.artist || 'Unknown Artist'}
              </td>
              
              {/* Desktop Album Column (Hidden on Mobile & Tablet) */}
              <td className="p-3 md:p-5 text-gray-400 truncate max-w-[200px] hidden lg:table-cell" title={track.album || 'Unknown Album'}>
                {track.album || 'Unknown Album'}
              </td>
              
              <td className="p-3 md:p-5 text-gray-400 text-right font-mono text-xs">
                {formatDuration(track.duration)}
              </td>
              
              <td className="p-3 md:p-5 text-right">
                {/* Pushed slightly to the right on mobile to align with the Time column */}
                <div className="flex items-center justify-end md:justify-center">
                  {isAddMode ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleAdd(track.id); }}
                      className={`p-2 rounded-full transition-all ${selectedIds.includes(track.id) ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
                    >
                      {selectedIds.includes(track.id) ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      )}
                    </button>
                  ) : showStar ? (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (onToggleFavorite) onToggleFavorite(track.id, track.isFavourite);
                      }} 
                      className={`transition-transform hover:scale-110 active:scale-95 p-1 md:p-0 ${track.isFavourite ? 'text-yellow-400 drop-shadow-md' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      <svg 
                        className="w-5 h-5 transition-colors" 
                        fill={track.isFavourite ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackTable;