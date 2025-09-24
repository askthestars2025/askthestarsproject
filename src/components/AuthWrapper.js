import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Cosmic Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-2 h-2 bg-white rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-32 right-20 w-1 h-1 bg-white rounded-full animate-pulse delay-300 opacity-40"></div>
          <div className="absolute bottom-40 left-20 w-3 h-3 bg-white rounded-full animate-pulse delay-700 opacity-50"></div>
          <div className="absolute bottom-60 right-10 w-1 h-1 bg-white rounded-full animate-pulse delay-1000 opacity-30"></div>
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-500 opacity-40"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full animate-pulse delay-200 opacity-60"></div>
        </div>

        {/* Loading Content */}
        <div className="relative z-10 text-center text-white">
          {/* Lunatica Logo */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-light tracking-wider mb-4">
              Ask the Stars
            </h1>
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center animate-pulse delay-200">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-400"></div>
                </div>
              </div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          
          {/* Loading Text */}
          <p className="text-gray-400 text-lg">Connecting to the cosmos...</p>
          
          {/* Loading Dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return children({ user });
}