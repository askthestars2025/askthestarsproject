// pages/success.js - CREATE THIS FILE
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';

export default function Success() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(true);
  const { session_id } = router.query;

  useEffect(() => {
    if (session_id) {
      // Verify the session was successful
      verifySession();
    }
  }, [session_id]);

  const verifySession = async () => {
    try {
      // Optional: You can verify the session server-side if needed
      // For now, just redirect after a short delay
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Session verification error:', error);
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Processing Your Subscription...</h2>
          <p className="text-gray-400">Please wait while we activate your premium features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Welcome to Premium!
          </span>
        </h1>
        
        <p className="text-gray-300 mb-8 leading-relaxed">
          Your subscription is now active. You have full access to all cosmic features and premium insights.
        </p>

        <div className="bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 mb-8">
          <h3 className="text-lg font-semibold mb-4">What's Next?</h3>
          <div className="space-y-2 text-sm text-gray-300 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <span>Unlimited cosmic consultations</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <span>Advanced compatibility analysis</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <span>Priority dream interpretation</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <span>Daily personalized horoscopes</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:scale-105"
        >
          Start Your Cosmic Journey
        </button>

        {session_id && (
          <p className="text-xs text-gray-500 mt-4">
            Session: {session_id.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}