import React from 'react';

const SettingsDrawer = ({ isOpen, onClose, selectedFolder, onSync, onChangeFolder, onLogout }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity" onClick={onClose} />
      
      {/* MOBILE FIX: Changed w-80 to "w-full sm:w-80". Removed the conflicting z-[60] */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-[#121826] border-l border-white/5 z-[201] transform transition-transform duration-300 ease-in-out shadow-2xl translate-x-0`}>
        
        {/* Adjusted padding for mobile */}
        <div className="p-5 sm:p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold font-display">Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-1 space-y-4">
            {selectedFolder && (
              <button onClick={() => { onClose(); onSync(); }} className="w-full text-left px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors text-sm font-semibold flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Sync Library Updates
              </button>
            )}

            <button onClick={onChangeFolder} className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm font-semibold flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              Change Drive Folder
            </button>
          </div>

          <button onClick={onLogout} className="w-full py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-bold text-sm">
            Log Out
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsDrawer;