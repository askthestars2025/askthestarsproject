// pages/pricing.js - CREATE THIS FILE
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Pricing() {
  const router = useRouter();
  const [showCancelMessage, setShowCancelMessage] = useState(false);
  const { cancelled } = router.query;

  useEffect(() => {
    if (cancelled === 'true') {
      setShowCancelMessage(true);
    }
  }, [cancelled]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/5 via-orange-500/2 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-orange-500/3 via-red-500/1 to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          {/* Cancel Message */}
          {showCancelMessage && (
            <div className="mb-8 bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Payment Cancelled</h2>
              <p className="text-gray-400 mb-4">
                No worries! You can always come back when you're ready to unlock your cosmic potential.
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:scale-105"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {/* Main Content */}
          <div className="mb-8">
            <div className="text-6xl mb-6">⭐</div>
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Choose Your Cosmic Journey
              </span>
            </h1>
            <p className="text-xl text-gray-300">
              Ready to unlock your full potential? Pick the plan that's right for you.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:scale-105"
            >
              Explore Premium Options
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full text-gray-400 hover:text-white py-3 transition-colors"
            >
              Continue with Free Features
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}