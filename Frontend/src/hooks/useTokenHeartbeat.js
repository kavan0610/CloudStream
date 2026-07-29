import { useEffect } from 'react';
import { authApi } from '../services/api';

export const useTokenHeartbeat = (userId, onTokenRefresh) => {
  useEffect(() => {
    if (!userId) return;

    // 1. We extract the refresh logic into a reusable function
    const performRefresh = async () => {
      try {
        const response = await authApi.refreshToken(userId);
        const newAccessToken = response.data.accessToken;
        
        localStorage.setItem('driveToken', newAccessToken);
        if (onTokenRefresh) onTokenRefresh(newAccessToken);
        
        console.log("🔄 Auth: Fetched fresh Google token.");
      } catch (error) {
        console.error("Failed to auto-refresh token. User may need to log in again.", error);
      }
    };

    // 2. THE FIX: Run it immediately when the app boots up! (Cold Start Fix)
    performRefresh();

    // 3. Then start the 50-minute heartbeat loop
    const interval = setInterval(performRefresh, 50 * 60 * 1000); 

    return () => clearInterval(interval);
  }, [userId, onTokenRefresh]);
};