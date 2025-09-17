import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function TrialSignup({ user, onAccept, onSkip }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handlePremium = async (plan) => {
    setLoading(plan);
    setError(null);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          plan, 
          userId: user.uid,
          email: user.email
        })
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.message);
      setLoading(null);
    }
  };

  const premiumFeatures = [
    { icon: "🎱", text: "Unlimited cosmic consultations" },
    { icon: "💕", text: "Advanced soulmate matching" },
    { icon: "🔮", text: "Priority dream interpretation" },
    { icon: "⭐", text: "Daily personalized horoscopes" },
    { icon: "🌙", text: "Complete compatibility analysis" },
    { icon: "🔗", text: "Relationship guidance" },
    { icon: "☁️", text: "Premium tarot readings" },
    { icon: "🌟", text: "Astrological event alerts" }
  ];

  const testimonials = [
    { name: "Sarah M.", text: "Found my soulmate through the compatibility readings!" },
    { name: "David L.", text: "The dream interpretations changed my perspective completely." },
    { name: "Maria R.", text: "Daily horoscopes keep me aligned with cosmic energy." }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Enhanced Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-radial from-red-500/10 via-orange-500/5 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-48 h-48 sm:w-80 sm:h-80 bg-gradient-radial from-orange-500/8 via-red-500/4 to-transparent blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-gradient-radial from-orange-400/6 to-transparent blur-3xl"></div>
      </div>

      {/* Floating Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-float shadow-lg shadow-orange-500/50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-10 pt-4 sm:pt-8">
          <div className="text-4xl sm:text-6xl lg:text-8xl mb-4 sm:mb-6">✨</div>
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight px-2">
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent">
              Unlock Your Cosmic Destiny
            </span>
          </h1>
          <p className="text-base sm:text-xl lg:text-2xl text-gray-300 mb-4 sm:mb-6 max-w-3xl mx-auto leading-relaxed px-4">
            Transform your life with personalized celestial guidance from ancient wisdom and modern insights
          </p>
          
          {/* Social Proof - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8">
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full border border-gray-800"></div>
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full border border-gray-800"></div>
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-red-400 to-orange-400 rounded-full border border-gray-800"></div>
              </div>
              <span>10,000+ cosmic journeys</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>⭐⭐⭐⭐⭐</span>
              <span>4.9/5 rating</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 max-w-md mx-auto">
            <p className="text-red-400 text-sm">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 text-xs underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Premium Features Grid - Mobile Optimized */}
        <div className="mb-6 sm:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-8 px-4">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Premium Features Await You
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto px-2">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg shadow-orange-500/30">
                  <span className="text-lg sm:text-xl lg:text-2xl">{feature.icon}</span>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-gray-300 leading-tight px-1">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Cards - Mobile First Design */}
        <div className="mb-6 sm:mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {/* Annual Plan - Featured */}
            <div className="relative group lg:scale-105 order-1">
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 sm:px-4 sm:py-1 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                  🏆 BEST VALUE - Save 81%
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-2 border-orange-500/50 shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-2xl sm:rounded-3xl"></div>
                <div className="relative z-10">
                  <div className="text-center mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Annual Membership</h3>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">$49.99</div>
                    <div className="text-gray-400 mb-1 sm:mb-2 text-sm sm:text-base">per year</div>
                    <div className="text-green-400 text-xs sm:text-sm">
                      <span className="line-through text-gray-500">$259.48</span> Save $209.49
                    </div>
                  </div>
                  <button
                    onClick={() => handlePremium('annual')}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 disabled:opacity-50 disabled:transform-none mb-3 sm:mb-4 touch-manipulation active:scale-95"
                  >
                    {loading === 'annual' ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Transform Your Destiny Now'
                    )}
                  </button>
                  <p className="text-center text-gray-400 text-xs sm:text-sm">
                    Just $4.17/month • Cancel anytime
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Plan */}
            <div className="bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-700/50 shadow-xl order-2">
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Weekly Access</h3>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">$4.99</div>
                <div className="text-gray-400 mb-1 sm:mb-2 text-sm sm:text-base">per week</div>
                <div className="text-orange-400 text-xs sm:text-sm">Perfect for exploring</div>
              </div>
              <button
                onClick={() => handlePremium('weekly')}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-50 disabled:transform-none mb-3 sm:mb-4 touch-manipulation active:scale-95"
              >
                {loading === 'weekly' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Start Weekly Journey'
                )}
              </button>
              <p className="text-center text-gray-400 text-xs sm:text-sm">
                No commitment • Cancel anytime
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials - Mobile Optimized */}
        <div className="mb-6 sm:mb-10">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-center mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              What Our Community Says
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto px-2">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-900/60 via-black/70 to-gray-900/60 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-gray-700/50">
                <p className="text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3">"{testimonial.text}"</p>
                <p className="text-orange-400 text-xs font-semibold">- {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Signals - Mobile Optimized */}
        <div className="text-center px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
            <div className="flex items-center space-x-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span>Powered by Stripe</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs max-w-lg mx-auto">
            Your cosmic journey is protected by industry-leading security
          </p>
        </div>
      </div>

      {/* Safe area padding for mobile browsers */}
      <div className="h-4 sm:h-0"></div>

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
        
        /* Enhanced mobile touch targets */
        @media (max-width: 640px) {
          button {
            min-height: 48px;
          }
        }
        
        /* Safe area support for mobile browsers */
        @supports(padding: max(0px)) {
          .min-h-screen {
            min-height: 100vh;
            min-height: -webkit-fill-available;
          }
        }
      `}</style>
    </div>
  );
}