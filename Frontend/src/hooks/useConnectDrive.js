// src/hooks/useConnectDrive.js
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi } from '../services/api';

export const useConnectDrive = (onSuccessCallback) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const connectDrive = useGoogleLogin({
    flow: 'auth-code',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
    prompt: 'consent', 
    include_granted_scopes: true,
    
    onSuccess: async (codeResponse) => {
      setIsAuthenticating(true);
      try {
        // Now using our clean API layer!
        const res = await authApi.verifyGoogleCode(codeResponse.code);
        
        const newAccessToken = res.data.accessToken;
        localStorage.setItem('driveToken', newAccessToken);
        
        // Pass the token back to the component so it can launch the Picker
        if (onSuccessCallback) {
          onSuccessCallback(newAccessToken);
        }
      } catch (error) {
        console.error("Failed to upgrade Drive permissions:", error);
      } finally {
        setIsAuthenticating(false);
      }
    },
    onError: () => console.error('Google Drive connection aborted')
  });

  return { connectDrive, isAuthenticating };
};