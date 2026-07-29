import React, { useState, useMemo, useEffect } from 'react';
import TrackTable from './TrackTable';

const AddSongsModal = ({ isOpen, onClose, onSave, libraryTracks = [], playlistTracks = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIds([]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Filter out tracks that are ALREADY in the playlist
  const playlistTrackIds = new Set(playlistTracks.map(pt => pt.trackId || pt.id));
  const availableTracks = libraryTracks.filter(track => !playlistTrackIds.has(track.id));

  // 2. Apply search filter
  const filteredTracks = availableTracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Toggle selection
  const handleToggleAdd = (trackId) => {
    setSelectedIds(prev => 
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const handleSave = () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    onSave(selectedIds);
  };

  return (
    // MOBILE FIX 1: items-end on mobile pushes the modal to the bottom like a native sheet
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-8">
      
      {/* MOBILE FIX 2: h-[90vh] and rounded-t-3xl only on mobile for a flush bottom edge */}
      <div className="bg-[#121826] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header & Search */}
        {/* MOBILE FIX 3: Tighter padding (p-5), left-aligned flex layout so title doesn't awkwardly center */}
        <div className="p-5 md:p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold font-display">Add Songs</h3>
            <p className="text-gray-400 text-xs md:text-sm mt-1">{selectedIds.length} tracks selected</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your library..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 md:py-3 pl-10 pr-4 text-sm md:text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TrackTable 
            tracks={filteredTracks} 
            isAddMode={true} 
            selectedIds={selectedIds} 
            onToggleAdd={handleToggleAdd} 
          />
        </div>

        {/* Footer Actions */}
        {/* MOBILE FIX 4: pb-6 adds space for iPhone home bars, flex-1 forces buttons to split 50/50 width */}
        <div className="p-4 pb-6 md:p-6 border-t border-white/10 flex justify-end gap-3 bg-[#121826] rounded-none md:rounded-b-3xl mt-auto">
          <button 
            onClick={onClose} 
            disabled={isSubmitting} 
            className="flex-1 md:flex-none px-4 md:px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-sm transition-colors text-center"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={selectedIds.length === 0 || isSubmitting} 
            className="flex-1 md:flex-none justify-center px-2 md:px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 rounded-full font-semibold text-sm transition-colors shadow-md flex items-center gap-2 truncate"
          >
            {isSubmitting ? 'Saving...' : `Add ${selectedIds.length}`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddSongsModal;