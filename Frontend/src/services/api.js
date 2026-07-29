// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api'
});

export const libraryApi = {
  fetchLibrary: (userId) => api.get(`/library/${userId}`),
  toggleFavorite: (trackId, isFavourite, userId) => api.put(`/library/${trackId}/favorite`, { isFavourite, userId }),
};

export const playlistApi = {
  // Existing Favorites generator
  createFavoritesPlaylist: (userId) => api.post('/playlists', { 
    name: 'Favorites', 
    userId, 
    coverImage: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' 
  }),
  // New standard endpoints
  fetchUserPlaylists: (userId) => api.get(`/playlists/user/${userId}`),
  fetchPlaylist: (playlistId) => api.get(`/playlists/${playlistId}`),
  createPlaylist: (userId, name, coverImage) => api.post('/playlists', { userId, name, coverImage }),
  updatePlaylist: (id, name, coverImage) => api.put(`/playlists/${id}`, { name, coverImage }),
  deletePlaylist: (id) => api.delete(`/playlists/${id}`),
  addTracks: (playlistId, trackIds) => api.post(`/playlists/${playlistId}/tracks`, { trackIds }),
  updateTracks: (playlistId, trackIds) => api.put(`/playlists/${playlistId}/tracks`, { trackIds })
};

export const syncApi = {
  startSync: (userId, folderId, accessToken) => api.post('/sync/start', { userId, folderId, accessToken }),
  checkStatus: (jobId) => api.get(`/sync/status/${jobId}`)
};

export const authApi = {
  verifyGoogleCode: (code) => api.post('/auth/google', { code }),
  refreshToken: (userId) => api.post('/auth/refresh', { userId }),
  loginDemo: () => api.post(`/auth/demo`)
};

export const authService = {
  logout: () => {
    localStorage.removeItem('driveToken');
    localStorage.removeItem('user');
  }
};

export default api;