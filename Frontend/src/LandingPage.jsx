// import React, { useState, useEffect } from 'react';
// import { useGoogleLogin } from '@react-oauth/google';
// import { useNavigate } from 'react-router-dom';
// import { authApi } from './services/api';

// const LandingPage = () => {
//   // 1. Changed to track WHICH button is loading
//   const [loadingType, setLoadingType] = useState(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//   const checkAuth = async () => {
//     const storedUser = localStorage.getItem('user');

//     if (storedUser) {
//       try {
//         const userObj = JSON.parse(storedUser);
        
//         // 1. Ask the backend for a fresh 1-hour token using their ID
//         const res = await authApi.refreshToken(userObj.id);
//         const freshToken = res.data.accessToken;

//         // 2. Save the new token
//         localStorage.setItem('driveToken', freshToken);

//         // 3. Jump to the dashboard with the fresh token so music plays!
//         navigate('/dashboard', { 
//           state: { user: userObj, driveToken: freshToken } 
//         });
//       } catch (error) {
//         console.error("Session expired or invalid:", error);
//         // If the refresh fails (e.g., they revoked access), clear the broken data
//         localStorage.removeItem('driveToken');
//         localStorage.removeItem('user');
//       }
//     }
//   };

//   checkAuth();
// }, [navigate]);

//   const handleGoogleAuth = useGoogleLogin({
//     flow: 'auth-code', 
    
//     onSuccess: async (codeResponse) => {
//       setLoadingType('google'); // 2. Set specific loading state
//       try {
//         // CLEAN API CALL: No hardcoded URLs!
//         const res = await authApi.verifyGoogleCode(codeResponse.code);
        
//         localStorage.setItem('driveToken', res.data.accessToken);
//         localStorage.setItem('user', JSON.stringify(res.data.user));
        
//         navigate('/dashboard', { 
//           state: { user: res.data.user, driveToken: res.data.accessToken } 
//         }); 
//       } catch (error) {
//         console.error("Authentication crashed:", error);
//       } finally {
//         setLoadingType(null); // 3. Reset state
//       }
//     },
//     onError: () => console.log('Google Sign-In Aborted')
//   });

//   const handleDemoLogin = async () => {
//     setLoadingType('demo'); // 4. Set specific loading state
//     try {
//       const res = await authApi.loginDemo();
      
//       // Save the token and jump to the dashboard just like a real login!
//       localStorage.setItem('driveToken', res.data.accessToken);
//       localStorage.setItem('user', JSON.stringify(res.data.user));
      
//       navigate('/dashboard', { 
//         state: { user: res.data.user, driveToken: res.data.accessToken } 
//       }); 
//     } catch (error) {
//       console.error("Demo login crashed:", error);
//       alert("Demo is currently unavailable. Please try again later.");
//     } finally {
//       setLoadingType(null); // 5. Reset state
//     }
//   };

//   return (
//     <div className="relative min-h-screen bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_#1A2235,_#0B0F19)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      
//       {/* Top Navigation / Branding */}
//       <div className="absolute top-0 left-0 w-full p-6 md:px-10 flex justify-between items-center z-20">
//         <div className="flex items-center gap-2.5 md:gap-3 cursor-pointer group">
//           <img 
//             src="/icon.png" 
//             alt="CloudStream Icon" 
//             className="w-6 h-6 md:w-8 md:h-8 object-contain group-hover:scale-110 transition-transform" 
//           />
//           <span className="font-display text-xl md:text-2xl font-bold tracking-wider text-white">
//             CloudStream
//           </span>
//         </div>
//       </div>

//       {/* Main Content Container */}
//       <div className="max-w-3xl text-center space-y-6 md:space-y-8 z-10 mt-10 md:mt-0">
//         <div>
//           <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
//             Your Music,<br />
//             <span className="text-blue-500 drop-shadow-md">Anywhere.</span>
//           </h1>
//           <p className="mt-4 text-lg md:text-2xl text-gray-400 font-light max-w-2xl mx-auto px-2">
//             Stream your entire library seamlessly. Connect your storage, organize your playlists, and experience high-fidelity playback in a clean, distraction-free environment.
//           </p>
//         </div>

//         {/* Action Buttons Group */}
//         <div className="mt-10 flex flex-col items-center gap-4 pt-6 w-full max-w-xs sm:max-w-sm mx-auto">
          
//           {/* Primary CTA: Google Auth */}
//           <button 
//             onClick={handleGoogleAuth} 
//             disabled={loadingType !== null}
//             className="w-full font-sans px-8 py-4 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-bold rounded-full transition-all duration-200 transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3"
//           >
//             <svg className="w-5 h-5 text-gray-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
//               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
//               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
//               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
//               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
//             </svg>
//             {loadingType === 'google' ? "Connecting..." : "Continue with Google"}
//           </button>

//           {/* Secondary CTA: View Demo */}
//           <button 
//             onClick={handleDemoLogin}
//             disabled={loadingType !== null}
//             className="w-full px-8 py-4 bg-transparent border-2 border-white/20 hover:border-white/50 hover:bg-white/5 text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 group"
//           >
//             {loadingType === 'demo' ? "Loading Demo..." : "View Demo"}
//             <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
//           </button>

//         </div>
//       </div>
//     </div>
//   );
// };

// export default LandingPage;

import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { authApi } from './services/api';

const LandingPage = () => {
  // 1. New State: Set to true ONLY if they have data saved, otherwise false immediately
  const [isCheckingAuth, setIsCheckingAuth] = useState(!!localStorage.getItem('user'));
  const [loadingType, setLoadingType] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          
          // Ask the backend for a fresh token
          const res = await authApi.refreshToken(userObj.id);
          const freshToken = res.data.accessToken;

          localStorage.setItem('driveToken', freshToken);

          navigate('/dashboard', { 
            state: { user: userObj, driveToken: freshToken } 
          });
        } catch (error) {
          console.error("Session expired or invalid:", error);
          localStorage.removeItem('driveToken');
          localStorage.removeItem('user');
          // 2. Token failed/expired, stop loading and show login buttons
          setIsCheckingAuth(false);
        }
      } else {
        // No user found, stop loading immediately
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleGoogleAuth = useGoogleLogin({
    flow: 'auth-code', 
    onSuccess: async (codeResponse) => {
      setLoadingType('google'); 
      try {
        const res = await authApi.verifyGoogleCode(codeResponse.code);
        localStorage.setItem('driveToken', res.data.accessToken);
        localStorage.setItem('user', JSON.stringify(res.data.user)); 
        
        navigate('/dashboard', { 
          state: { user: res.data.user, driveToken: res.data.accessToken } 
        }); 
      } catch (error) {
        console.error("Authentication crashed:", error);
      } finally {
        setLoadingType(null); 
      }
    },
    onError: () => console.log('Google Sign-In Aborted')
  });

  const handleDemoLogin = async () => {
    setLoadingType('demo'); 
    try {
      const res = await authApi.loginDemo();
      
      localStorage.setItem('driveToken', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user)); 
      
      navigate('/dashboard', { 
        state: { user: res.data.user, driveToken: res.data.accessToken } 
      }); 
    } catch (error) {
      console.error("Demo login crashed:", error);
      alert("Demo is currently unavailable. Please try again later.");
    } finally {
      setLoadingType(null); 
    }
  };

  // 3. The Splash Screen: If we are verifying the token, show this instead!
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_#1A2235,_#0B0F19)] flex flex-col justify-center items-center">
        <div className="flex flex-col items-center animate-pulse">
          <img src="/icon.png" alt="Loading" className="w-16 h-16 mb-6 opacity-80" />
          <h2 className="text-xl font-display text-white tracking-widest uppercase opacity-80">
            Resuming Session
          </h2>
        </div>
      </div>
    );
  }

  // --- STANDARD LOGIN UI ---
  return (
    <div className="relative min-h-screen bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_#1A2235,_#0B0F19)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full p-6 md:px-10 flex justify-between items-center z-20">
        <div className="flex items-center gap-2.5 md:gap-3 cursor-pointer group">
          <img 
            src="/icon.png" 
            alt="CloudStream Icon" 
            className="w-6 h-6 md:w-8 md:h-8 object-contain group-hover:scale-110 transition-transform" 
          />
          <span className="font-display text-xl md:text-2xl font-bold tracking-wider text-white">
            CloudStream
          </span>
        </div>
      </div>

      <div className="max-w-3xl text-center space-y-6 md:space-y-8 z-10 mt-10 md:mt-0">
        <div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
            Your Music,<br />
            <span className="text-blue-500 drop-shadow-md">Anywhere.</span>
          </h1>
          <p className="mt-4 text-lg md:text-2xl text-gray-400 font-light max-w-2xl mx-auto px-2">
            Stream your entire library seamlessly. Connect your storage, organize your playlists, and experience high-fidelity playback in a clean, distraction-free environment.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 pt-6 w-full max-w-xs sm:max-w-sm mx-auto">
          
          <button 
            onClick={handleGoogleAuth} 
            disabled={loadingType !== null}
            className="w-full font-sans px-8 py-4 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-bold rounded-full transition-all duration-200 transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 text-gray-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loadingType === 'google' ? "Connecting..." : "Continue with Google"}
          </button>

          <button 
            onClick={handleDemoLogin}
            disabled={loadingType !== null}
            className="w-full px-8 py-4 bg-transparent border-2 border-white/20 hover:border-white/50 hover:bg-white/5 text-white font-bold rounded-full transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            {loadingType === 'demo' ? "Loading Demo..." : "View Demo"}
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default LandingPage;