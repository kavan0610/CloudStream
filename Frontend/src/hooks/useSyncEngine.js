// src/hooks/useSyncEngine.js
import { useState, useRef, useCallback } from 'react';
import { syncApi } from '../services/api';

export const useSyncEngine = (userId, driveToken, onSyncComplete) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncProgress, setSyncProgress] = useState({ filesFound: 0, progress: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const pollingRef = useRef(null);

  const startBackgroundSync = async (folderId, tokenOverride) => {
    setIsSyncing(true);
    setSyncStatus('initializing');
    
    const tokenToUse = typeof tokenOverride === 'string' ? tokenOverride : driveToken;
    
    try {
      const response = await syncApi.startSync(userId, folderId, tokenToUse);
      trackSyncProgress(response.data.jobId);
    } catch (error) {
      console.error("Failed to start sync:", error);
      setSyncStatus('failed');
      setTimeout(() => setSyncStatus(null), 4000);
      setIsSyncing(false);
    }
  };

  const trackSyncProgress = useCallback((jobId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const response = await syncApi.checkStatus(jobId);
        const { status, filesFound, progress } = response.data;
        
        setSyncStatus(status);
        setSyncProgress({ filesFound, progress: progress || 0 });
        
        if (status === 'complete' || status === 'failed') {
          clearInterval(pollingRef.current);
          setIsSyncing(false);
          
          if (status === 'complete') {
            if (onSyncComplete) onSyncComplete();
            setTimeout(() => setSyncStatus(null), 2500);
          } else {
            setTimeout(() => setSyncStatus(null), 4000);
          }
        }
      } catch (error) {
        clearInterval(pollingRef.current);
        setSyncStatus('failed');
        setTimeout(() => setSyncStatus(null), 4000);
        setIsSyncing(false);
      }
    }, 2000);
  }, [onSyncComplete]);

  const clearSyncInterval = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  return { syncStatus, syncProgress, isSyncing, startBackgroundSync, clearSyncInterval };
};