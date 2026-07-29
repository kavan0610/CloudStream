const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Microservice Controllers
const { handleGoogleLogin, refreshGoogleToken, loginDemo } = require('./controllers/authController');
const { startSync, getSyncStatus, handleLoginDeltaSync } = require('./controllers/syncController');
const { getUserLibrary, toggleFavorite } = require('./controllers/libraryController');
const { createPlaylist, getUserPlaylists, getPlaylistDetails, updatePlaylist, deletePlaylist, addTracksToPlaylist , updatePlaylistTracks} = require('./controllers/playlistController');

const app = express();

// Global Middleware
// Configured to allow requests from your Vite frontend
app.use(cors({ 
  origin: ['http://localhost:5173', process.env.FRONTEND_URL]
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==========================================
// 1. Authentication Microservice Routes
// ==========================================
// Handles "Find or Create" user account check upon signing up/in
app.post('/api/auth/google', handleGoogleLogin);

// ==========================================
// 2. Google Drive Sync Microservice Routes
// ==========================================
// Kicks off the non-blocking background folder scan and returns a jobId
app.post('/api/sync/start', startSync);

app.post('/api/sync/delta', handleLoginDeltaSync);

app.post('/api/playlists', createPlaylist);

app.post('/api/playlists/:playlistId/tracks', addTracksToPlaylist);

app.post('/api/auth/refresh', refreshGoogleToken);

app.post('/api/auth/demo', loginDemo);

// Polling endpoint for the frontend to fetch real-time status updates
app.get('/api/sync/status/:jobId', getSyncStatus);

app.get('/api/library/:userId', getUserLibrary);

app.get('/api/playlists/user/:userId', getUserPlaylists);
app.get('/api/playlists/:playlistId', getPlaylistDetails);


app.put('/api/playlists/:playlistId', updatePlaylist);

app.put('/api/playlists/:id/tracks', updatePlaylistTracks);

app.put('/api/library/:trackId/favorite', toggleFavorite);

app.delete('/api/playlists/:playlistId', deletePlaylist);
// ==========================================
// Server Initialization
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  CloudStream Backend Microservices Running   `);
  console.log(`  URL: http://localhost:${PORT}          `);
  console.log(`=========================================`);
});
