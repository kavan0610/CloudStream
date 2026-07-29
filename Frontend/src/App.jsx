import React from 'react';
import { Routes, Route } from 'react-router-dom'; // <-- Removed BrowserRouter from here
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
    </Routes>
  );
}

export default App;