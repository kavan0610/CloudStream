import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export const useAuthManager = (user, driveToken, setDriveToken, startBackgroundSync, clearSyncInterval) => {
  const navigate = useNavigate();
  const [pickerLoading, setPickerLoading] = useState(false);
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  const handleLogout = () => {
    if (clearSyncInterval) clearSyncInterval();
    authService.logout();                       
    navigate('/');                              
  };

  const handleOpenPicker = (tokenOrEvent, setSelectedFolder, setIsSettingsOpen) => {
    const activeToken = typeof tokenOrEvent === 'string' ? tokenOrEvent : driveToken;
    if (!activeToken) return;

    setDriveToken(activeToken); 
    if (setIsSettingsOpen) setIsSettingsOpen(false);
    setPickerLoading(true);

    window.gapi.load('picker', () => {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder');

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(activeToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const folder = data.docs[0];
            setSelectedFolder({ id: folder.id, name: folder.name });
            await startBackgroundSync(folder.id, activeToken); 
          }
        }).build();

      picker.setVisible(true);
      setPickerLoading(false);
    });
  };

  return { handleLogout, handleOpenPicker, pickerLoading };
};