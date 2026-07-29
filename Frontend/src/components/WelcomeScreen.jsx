import React from 'react';
import { useConnectDrive } from '../hooks/useConnectDrive'; // Adjust path if needed

const WelcomeScreen = ({ userName, onConnect, isLoading }) => {
  // Pass the onConnect function (which launches the picker) into the hook
  const { connectDrive, isAuthenticating } = useConnectDrive(onConnect);

  // Disable if the picker is loading OR if we are talking to the backend
  const isButtonDisabled = isLoading || isAuthenticating;

  return (
    // MOBILE FIX 1: Reduced top margin to mt-12 on mobile, added px-4 so text never touches screen edges
    <div className="flex flex-col items-center mt-12 md:mt-20 text-center space-y-4 md:space-y-6 px-4 w-full">
      
      {/* MOBILE FIX 2: Scaled text down to 3xl on phones so long names don't break awkwardly */}
      <h1 className="text-3xl md:text-4xl font-bold font-display break-words w-full">
        Welcome, <span className="text-blue-400">{userName}</span>
      </h1>
      
      <p className="text-sm md:text-base text-gray-400">
        Link your Google Drive folder to begin.
      </p>
      
      <button 
        onClick={connectDrive} 
        disabled={isButtonDisabled} 
        // MOBILE FIX 3: Button stretches to w-full on tiny screens, reverts to auto width on sm screens. Reduced padding.
        className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-white text-gray-900 text-sm md:text-base font-bold rounded-full transition-all hover:bg-gray-200 disabled:opacity-50 mt-4"
      >
        {isButtonDisabled ? "Connecting..." : "Connect Drive Folder"}
      </button>
    </div>
  );
};

export default WelcomeScreen;