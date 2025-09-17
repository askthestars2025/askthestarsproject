import { useState } from 'react';

export default function SubscriptionManagement({ user, userData, onBack }) {
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Check if user has active subscription
  const hasActiveSubscription = userData?.subscriptionStatus === 'active' ||
    userData?.plan === 'annual' ||
    userData?.plan === 'weekly';

  const getPlanDetails = () => {
    if (userData?.plan === 'annual') {
      return {
        name: 'Annual Stellar Membership',
        price: '$49.99',
        interval: 'year',
        features: [
          'Unlimited cosmic consultations',
          'Advanced soulmate matching',
          'Priority dream interpretation',
          'Daily personalized horoscopes',
          'Complete compatibility analysis',
          'Yearly destiny mapping',
          'VIP customer support'
        ]
      };
    } else if (userData?.plan === 'weekly') {
      return {
        name: 'Weekly Cosmic Access',
        price: '$4.99',
        interval: 'week',
        features: [
          'Unlimited cosmic consultations',
          'Advanced soulmate matching',
          'Priority dream interpretation',
          'Daily personalized horoscopes',
          'Romantic compatibility analysis',
          'Weekly cosmic forecast'
        ]
      };
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || user?.uid,
          subscriptionId: userData?.stripeSubscriptionId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Your subscription has been cancelled. You\'ll continue to have access until your current billing period ends.');
        setShowCancelModal(false);
        // Optionally refresh user data or redirect
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert(error.message || 'Failed to cancel subscription. Please contact support at support@askthestars.com');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = async (selectedPlan = 'weekly') => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user?.id || user?.uid,
          email: user?.email
        })
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const planDetails = getPlanDetails();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/5 via-orange-500/2 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-orange-500/3 via-red-500/1 to-transparent blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 safe-area-top relative z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 touch-manipulation active:scale-95 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Subscription</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 max-w-lg mx-auto relative z-10">
        {hasActiveSubscription && planDetails ? (
          // Active Subscription View
          <div className="space-y-4 sm:space-y-6">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-green-500/30 shadow-lg shadow-green-500/10">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    Active Subscription
                  </span>
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">You have full access to all cosmic features</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm sm:text-base">Plan</span>
                  <span className="font-semibold text-sm sm:text-base">{planDetails.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm sm:text-base">Price</span>
                  <span className="font-semibold text-sm sm:text-base">{planDetails.price}/{planDetails.interval}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm sm:text-base">Status</span>
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                    {userData?.subscriptionStatus === 'cancelled' ? 'Cancelled' : 'Active'}
                  </span>
                </div>
                {userData?.subscriptionDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm sm:text-base">Started</span>
                    <span className="font-semibold text-sm sm:text-base">{formatDate(userData.subscriptionDate)}</span>
                  </div>
                )}
                {userData?.subscriptionEndDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm sm:text-base">
                      {userData?.subscriptionStatus === 'cancelled' ? 'Expires' : 'Renews'}
                    </span>
                    <span className="font-semibold text-sm sm:text-base">{formatDate(userData.subscriptionEndDate)}</span>
                  </div>
                )}
              </div>

              {/* Cancel Subscription Button - only show if not already cancelled */}
              {userData?.subscriptionStatus !== 'cancelled' && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-700/50">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={loading}
                    className="w-full text-center text-red-400 hover:text-red-300 text-sm transition-colors py-2 disabled:opacity-50"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>

            {/* Plan Features */}
            <div className="bg-gradient-to-br from-gray-900/60 via-black/70 to-gray-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 text-center">Your Premium Benefits</h3>
              <div className="space-y-2 sm:space-y-3">
                {planDetails.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-300 text-sm sm:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-gray-500 text-xs">
              Questions about your subscription? Contact our support team at support@askthestars.com
            </div>
          </div>
        ) : (
          // No Active Subscription View
          <div className="text-center space-y-4 sm:space-y-6 pt-8 sm:pt-12">
            <div className="bg-gradient-to-br from-gray-900/60 via-black/70 to-gray-900/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-gray-700/50">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m8-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">No Active Subscription</h2>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                You're currently using the free version. Upgrade to unlock all premium cosmic features and transform your destiny.
              </p>

              {userData?.subscriptionStatus === 'cancelled' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                  <p className="text-yellow-400 text-xs sm:text-sm">
                    Your subscription was cancelled. You can resubscribe anytime to continue your cosmic journey.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => handleUpgradeClick('weekly')}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 text-sm sm:text-base touch-manipulation active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      <span>Weekly Plan - $4.99</span>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleUpgradeClick('annual')}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 text-sm sm:text-base touch-manipulation active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      <span>Annual Plan - $49.99 (Save 80%)</span>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Cancel Subscription?</h3>
              <p className="text-gray-400 text-sm">
                We're sorry to see you go! You'll lose access to all premium features at the end of your current billing period.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Yes, Cancel My Subscription'
                )}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Keep My Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}