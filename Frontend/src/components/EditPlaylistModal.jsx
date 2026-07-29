import React, { useState, useEffect } from 'react';

const PLAYLIST_COVERS = [
  'bg-gradient-to-br from-indigo-500 to-purple-500',
  'bg-gradient-to-br from-pink-500 to-rose-500',
  'bg-gradient-to-br from-emerald-400 to-cyan-500',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-fuchsia-600 to-pink-600',
  'bg-gradient-to-br from-red-500 to-orange-500',
  'bg-gradient-to-br from-teal-400 to-emerald-500'
];

const EditPlaylistModal = ({ isOpen, onClose, onSave, existingPlaylists, playlist }) => {
  const [name, setName] = useState("");
  const [selectedCover, setSelectedCover] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && playlist) {
      setName(playlist.name);
      setSelectedCover(playlist.coverImage);
      setError("");
      setIsSubmitting(false);
    }
  }, [isOpen, playlist]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    
    // Check for duplicates (ignoring the playlist's own current name)
    if (cleanName.toLowerCase() !== playlist.name.toLowerCase() && 
        existingPlaylists.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
      setError("A playlist with this name already exists.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    onSave(cleanName, selectedCover);
  };

  return (
    // FIX 1: z-[200], items-end on mobile, p-0 for edge-to-edge
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      
      {/* FIX 2: max-w-full on mobile, rounded-t-3xl for sheet effect, iOS home bar padding (pb-8) */}
      <div className="bg-[#121826] border border-white/10 p-6 pb-8 md:p-8 rounded-t-3xl md:rounded-3xl w-full max-w-full md:max-w-md shadow-2xl animate-fade-in">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold font-display">Edit Playlist</h3>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="flex flex-col items-center gap-5">
            <div className={`w-28 h-28 md:w-32 md:h-32 rounded-2xl shadow-xl ${selectedCover} flex items-center justify-center transition-all duration-300`}>
              <svg className="w-10 h-10 md:w-12 md:h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 md:gap-2">
              {PLAYLIST_COVERS.map((cover, idx) => (
                <button 
                  key={idx} type="button" onClick={() => setSelectedCover(cover)}
                  // Slightly larger touch targets on mobile (w-9 h-9)
                  className={`w-9 h-9 md:w-8 md:h-8 rounded-full ${cover} border-2 ${selectedCover === cover ? 'border-white scale-110' : 'border-transparent'} transition-all`}
                />
              ))}
            </div>
          </div>

          <div>
            <input 
              type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
              // FIX 3: text-base to prevent iOS zoom
              className={`w-full bg-white/5 border ${error ? 'border-rose-500' : 'border-white/10'} rounded-xl py-3 px-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              disabled={isSubmitting}
            />
            {error && <p className="text-rose-500 text-xs mt-2 ml-1">{error}</p>}
          </div>

          <div className="flex gap-3 md:gap-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 md:py-3 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-sm disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isSubmitting} className="flex-1 py-3.5 md:py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold text-sm disabled:opacity-50 transition-colors shadow-lg">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlaylistModal;