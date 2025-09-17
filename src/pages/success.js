// pages/success.js - CREATE THIS FILE
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Success() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const { session_id } = router.query;

  // Listen for real-time updates to user subscription
  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserData(data);
          
          // Check if subscription is now active
          if (data.subscriptionStatus === 'active') {
            setSubscriptionConfirmed(true);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Countdown and redirect
  useEffect(() => {
    if (subscriptionConfirmed && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      if (countdown === 1) {
        router.push('/');
      }

      return () => clearTimeout(timer);
    }
  }, [subscriptionConfirmed, countdown, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-green-500/10 via-emerald-500/5 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-emerald-500/8 via-green-500/4 to-transparent blur-3xl"></div>
      </div>

      {/* Floating Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-float shadow-lg shadow-green-500/50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          {/* Success Animation */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30 animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Payment Successful!
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8">
              Welcome to your cosmic journey! Your premium features are being activated...
            </p>
          </div>

          {/* Status Display */}
          <div className="bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10 mb-8">
            {!subscriptionConfirmed ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                  <span className="text-gray-300">Activating your premium features...</span>
                </div>
                <p className="text-sm text-gray-400">
                  This usually takes just a few seconds. Please wait while we confirm your payment.
                </p>
                {session_id && (
                  <p className="text-xs text-gray-500 font-mono">
                    Session: {session_id.substring(0, 20)}...
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 font-semibold">Premium Access Activated!</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-300">Plan:</p>
                    <p className="text-sm text-gray-400">
                      {userData?.plan === 'annual' ? 'Annual Stellar Membership' : 'Weekly Cosmic Access'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-300">Status:</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                      Active
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-4">
                    You now have access to all premium features including:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-300">Soulmate Matching</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-300">Dream Interpretation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-300">Compatibility Analysis</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-300">Premium Support</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <p className="text-lg font-semibold text-gray-300 mb-2">
                    Redirecting to your dashboard in {countdown} seconds...
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:scale-105"
                  >
                    Continue to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Support Info */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Having issues? Contact our support team at{' '}
              <a href="mailto:support@askthestars.com" className="text-green-400 hover:text-green-300 underline">
                support@askthestars.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(120deg); }
          66% { transform: translateY(5px) rotate(240deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}