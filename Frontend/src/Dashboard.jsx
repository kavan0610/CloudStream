import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, useParams } from 'react-router-dom';

// Hooks
import { useSearch } from './hooks/useSearch';
import { useSyncEngine } from './hooks/useSyncEngine';
import { usePlaylists } from './hooks/usePlaylists';
import { useLibraryManager } from './hooks/useLibraryManager';
import { useAuthManager } from './hooks/useAuthManager';
import { AudioProvider } from './context/AudioContext';

// UI Components
import Header from './components/Header';
import SettingsDrawer from './components/SettingsDrawer';
import WelcomeScreen from './components/WelcomeScreen';
import LibraryToolbar from './components/LibraryToolbar';
import TrackTable from './components/TrackTable';
import PlaylistRow from './components/PlaylistRow';
import PlaylistPage from './components/PlaylistPage';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import EditPlaylistModal from './components/EditPlaylistModal';
import AudioPlayer from './components/AudioPlayer';
import SyncIndicator from './components/SyncIndicator';

// --- URL-BASED PLAYLIST ROUTER ---
const PlaylistRoute = ({ playlists, tracks, deletePlaylist, refreshSinglePlaylist, fetchLibrary, updatePlaylistOptimistically }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const activePlaylistData = playlists.find(p => p.id === id);

  useEffect(() => {
    if (playlists.length > 0 && !activePlaylistData) {
      navigate('/dashboard', { replace: true, state: location.state }); 
    }
  }, [activePlaylistData, playlists, navigate, location.state]);

  if (!activePlaylistData) return null;

  return (
    <PlaylistPage 
      playlist={activePlaylistData} 
      onBack={() => navigate('/dashboard', { state: location.state })} 
      libraryTracks={tracks}
      onDelete={(id) => { deletePlaylist(id); navigate('/dashboard', { state: location.state }); }} 
      onRefresh={() => {refreshSinglePlaylist(id); fetchLibrary()}}
      optimisticUpdate={updatePlaylistOptimistically}
    />
  );
};

// --- MAIN DASHBOARD ---
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user || { id: '', name: 'User', driveFolderId: null };
  const [driveToken, setDriveToken] = useState(location.state?.driveToken || localStorage.getItem('driveToken'));
  
  // UI States
  const [selectedFolder, setSelectedFolder] = useState(user.driveFolderId ? { id: user.driveFolderId, name: "Linked Folder" } : null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isEditPlaylistOpen, setIsEditPlaylistOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState(null);

  // Controllers (Data & Logic)
  const { playlists, setPlaylists, createPlaylist, updatePlaylist, deletePlaylist, refreshSinglePlaylist, fetchPlaylists } = usePlaylists(user.id);
  
  const { tracks, libraryLoading, fetchLibrary, handleToggleFavorite, updatePlaylistOptimistically, handleFavoritesClick } = useLibraryManager(
    user, playlists, setPlaylists, fetchPlaylists, navigate, location
  );

  const { searchQuery, setSearchQuery, filteredItems } = useSearch(tracks);
  
  const { syncStatus, syncProgress, isSyncing, startBackgroundSync, clearSyncInterval } = useSyncEngine(
    user.id, driveToken, () => { fetchLibrary(); fetchPlaylists(); }
  );

  // --- NEW: Use the Auth Manager Hook ---
  const { handleLogout, handleOpenPicker, pickerLoading } = useAuthManager(
    user, 
    driveToken, 
    setDriveToken, 
    startBackgroundSync, 
    clearSyncInterval
  );

  useEffect(() => {
    if (!driveToken || !user.id) { navigate('/'); return; }
    if (user.driveFolderId) fetchLibrary();
    return () => clearSyncInterval();
  }, [driveToken, user.id, navigate]);

  return (
    <AudioProvider driveToken={location.state?.driveToken}>
      <div className="min-h-screen bg-[#0B0F19] text-white relative overflow-hidden pb-2">
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />
        <SyncIndicator isSyncing={isSyncing} syncStatus={syncStatus} progress={syncProgress.progress} />
        
        <SettingsDrawer 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          selectedFolder={selectedFolder}
          onSync={() => startBackgroundSync(selectedFolder.id)}
          onChangeFolder={(e) => handleOpenPicker(e, setSelectedFolder, setIsSettingsOpen)}
          onLogout={handleLogout} 
        />

        <CreatePlaylistModal isOpen={isCreatePlaylistOpen} onClose={() => setIsCreatePlaylistOpen(false)} onCreate={(n, c) => { createPlaylist(n, c); setIsCreatePlaylistOpen(false); }} existingPlaylists={playlists} />
        <EditPlaylistModal isOpen={isEditPlaylistOpen} onClose={() => setIsEditPlaylistOpen(false)} onSave={(n, c) => { updatePlaylist(playlistToEdit.id, n, c); setIsEditPlaylistOpen(false); }} existingPlaylists={playlists} playlist={playlistToEdit} />
        
        <main className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-28 pb-12">
          {!selectedFolder ? (
            <WelcomeScreen userName={user.name.split(' ')[0]} onConnect={(e) => handleOpenPicker(e, setSelectedFolder, null)} isLoading={pickerLoading || isSyncing} />
          ) : (
            <div className="w-full flex flex-col animate-fade-in">
              <Routes>
                <Route path="/" element={
                  <>
                    <PlaylistRow 
                      playlists={playlists} 
                      onCreateClick={() => setIsCreatePlaylistOpen(true)} 
                      onPlaylistClick={(id) => navigate(`/dashboard/playlist/${id}`, { state: location.state })} 
                      onFavoritesClick={handleFavoritesClick}
                      onEditClick={(p) => { setPlaylistToEdit(p); setIsEditPlaylistOpen(true); }} 
                      onDeleteClick={deletePlaylist} 
                    />
                    <LibraryToolbar folderName={selectedFolder.name} searchQuery={searchQuery} setSearchQuery={setSearchQuery} tracks={filteredItems} />
                    <TrackTable 
                      tracks={filteredItems} 
                      loading={libraryLoading || isSyncing}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </>
                } />
                <Route path="playlist/:id" element={
                  <PlaylistRoute 
                    playlists={playlists}
                    tracks={tracks}
                    deletePlaylist={deletePlaylist}
                    refreshSinglePlaylist={refreshSinglePlaylist}
                    fetchLibrary={fetchLibrary}
                    updatePlaylistOptimistically={updatePlaylistOptimistically}
                  />
                } />
              </Routes>
            </div>
          )}
        </main>
      </div>
      <AudioPlayer />
    </AudioProvider>
  );
};

export default Dashboard;