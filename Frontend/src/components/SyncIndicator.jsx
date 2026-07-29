import React from 'react';

const SyncIndicator = ({ isSyncing, syncStatus, progress }) => {
  // Hide the banner if nothing is happening
  if (!isSyncing && syncStatus !== 'complete' && syncStatus !== 'failed') return null;

  const getStatusText = () => {
    switch(syncStatus) {
      case 'initializing': return 'Starting sync...';
      case 'checking_changes': return 'Looking for new files...';
      case 'scanning': return 'Scanning Google Drive...';
      case 'syncing_metadata': return 'Importing audio tracks...';
      case 'complete': return 'Sync complete!';
      case 'failed': return 'Sync failed. Please try again.';
      default: return 'Syncing...';
    }
  };

  const isDone = syncStatus === 'complete' || syncStatus === 'failed';

  return (
    // MOBILE FIX 1: top-20 for smaller mobile header, top-24 on desktop
    // MOBILE FIX 2: w-[calc(100%-2rem)] gives a nice 1rem margin on the left and right on tiny phones
    <div className="fixed top-20 md:top-24 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in w-[calc(100%-2rem)] sm:w-auto flex justify-center pointer-events-none">
      
      {/* sm:w-80 locks it to 320px on desktop so it doesn't get massive */}
      <div className="bg-[#1A2235] border border-white/10 shadow-2xl rounded-2xl p-4 w-full sm:w-80 flex flex-col gap-3 pointer-events-auto">
        
        {/* Top Row: Icon, Text, and Percentage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {!isDone ? (
              // MOBILE FIX 3: Added shrink-0 so the spinner never squishes into an oval
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : syncStatus === 'complete' ? (
              <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            ) : (
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            )}
            {/* Added truncate so long status text doesn't break to a second line */}
            <span className="text-sm font-semibold text-white truncate">{getStatusText()}</span>
          </div>
          
          {!isDone && (
            <span className="text-xs font-bold text-blue-400 ml-3">{progress}%</span>
          )}
        </div>
        
        {/* Bottom Row: Progress Bar */}
        {!isDone && (
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default SyncIndicator;