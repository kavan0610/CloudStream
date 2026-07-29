import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const EditSongsModal = ({ isOpen, onClose, onSave, playlistTracks }) => {
  const [tracks, setTracks] = useState([]);
  const [removeIds, setRemoveIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setTracks(playlistTracks || []);
      setRemoveIds([]);
    }
  }, [isOpen, playlistTracks]);

  if (!isOpen) return null;

  // --- PROFESSIONAL DRAG & DROP HANDLER ---
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tracks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTracks(items);
  };

  const handleToggleRemove = (trackId) => {
    setRemoveIds(prev => 
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const handleSave = () => {
    const finalTracks = tracks.filter(t => !removeIds.includes(t.id));
    const finalTrackIds = finalTracks.map(t => t.id);
    onSave(finalTrackIds);
  };

  return (
    // MOBILE FIX 1: items-end pushes it to the bottom, p-0 removes side gaps on mobile
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      
      {/* MOBILE FIX 2: rounded-t-3xl and fixed height (h-[85vh]) for the mobile sheet look */}
      <div className="bg-[#121826] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-2xl h-[85vh] md:max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
        
        {/* MOBILE FIX 3: Tighter header padding */}
        <div className="p-5 md:p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-white">Edit Songs</h2>
            <p className="text-gray-400 text-xs md:text-sm mt-1">Drag to reorder tracks or select to remove.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* DRAG AND DROP CONTEXT */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tracks-list">
            {(provided) => (
              <div 
                // Added hidden scrollbars to keep it clean, tightened side padding
                className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                {...provided.droppableProps} 
                ref={provided.innerRef}
              >
                {tracks.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">This playlist is empty.</div>
                ) : (
                  tracks.map((track, index) => {
                    const isRemoving = removeIds.includes(track.id);
                    
                    return (
                      <Draggable 
                        key={track.id} 
                        draggableId={track.id} 
                        index={index}
                        isDragDisabled={isRemoving} // Prevent dragging if marked for deletion
                      >
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                            className={`flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl border transition-all ${
                              isRemoving 
                                ? 'bg-rose-500/5 border-rose-500/20 opacity-60' 
                                : snapshot.isDragging 
                                  ? 'bg-white/10 border-white/30 shadow-2xl scale-[1.02] z-50 ring-2 ring-blue-500/50' 
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className={`flex flex-col gap-1 p-2 ${isRemoving ? 'text-gray-600' : 'text-gray-400 group-hover:text-white transition-colors cursor-grab active:cursor-grabbing'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                              </svg>
                            </div>

                            <div className={`flex-1 min-w-0 ${isRemoving ? 'line-through decoration-rose-500/50' : ''}`}>
                              <p className="font-semibold text-white truncate text-sm md:text-base">{track.title}</p>
                              <p className="text-xs text-gray-400 truncate">{track.artist || 'Unknown Artist'}</p>
                            </div>

                            <button 
                              onClick={() => handleToggleRemove(track.id)}
                              className={`p-2 rounded-full transition-all relative z-10 ${
                                isRemoving 
                                  ? 'bg-white/10 text-white hover:bg-white/20' 
                                  : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'
                              }`}
                            >
                              {isRemoving ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg> 
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg> 
                              )}
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* MOBILE FIX 4: pb-6 for iOS bottom bar, flex-1 makes buttons 50/50 */}
        <div className="p-4 pb-6 md:p-6 border-t border-white/10 flex justify-end gap-3 bg-[#121826] mt-auto rounded-none md:rounded-b-3xl">
          <button 
            onClick={onClose} 
            className="flex-1 md:flex-none px-4 md:px-6 py-3 rounded-full font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors text-center"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 md:flex-none justify-center px-4 md:px-6 py-3 rounded-full font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg flex items-center"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditSongsModal;