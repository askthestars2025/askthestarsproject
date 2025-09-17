import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import SoulmateResults from './SoulmateResults';
import ConversationalOnboarding from './ConversationalOnboarding';
import TrialSignup from './TrialSignup';
import ChatInterface from './ChatInterface';
import SoulmateGenerator from './SoulmateGenerator';
import UserProfile from './UserProfile';
import ConversationHistory from './ConversationHistory';

export default function Dashboard({ user }) {
  const [currentScreen, setCurrentScreen] = useState('loading'); // loading, onboarding, trial, dashboard, results, chat, soulmate-generator, profile, history
  const [currentChatCategory, setCurrentChatCategory] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Simple feature access check (hidden from UI)
  const isPremiumUser = (userData) => {
    const isPremium = userData?.subscriptionStatus === 'active' || 
                     userData?.plan === 'premium' || 
                     userData?.plan === 'annual' || 
                     userData?.plan === 'weekly';
    return isPremium;
  };

  const dashboardFeatures = [
    {
      icon: "🎱",
      title: "Ask me anything",
      description: "Get cosmic guidance on any question",
      gradient: "from-red-500 to-orange-500",
      category: "ask-anything",
      free: true
    },
    {
      icon: "🔮",
      title: "Daily horoscope", 
      description: "Your personalized daily cosmic forecast",
      gradient: "from-orange-500 to-red-600",
      category: "daily-horoscope",
      free: true
    },
    {
      icon: "🌹",
      title: "Romantic compatibility",
      description: "Discover your perfect cosmic match",
      gradient: "from-red-400 to-orange-500",
      category: "romantic-compatibility",
      free: false
    },
    {
      icon: "🔗",
      title: "Your soulmate",
      description: "Find your destined life partner",
      gradient: "from-orange-600 to-red-500",
      category: "soulmate-generator",
      free: false
    },
    {
      icon: "🤝",
      title: "Friend compatibility",
      description: "Understand your friendships better",
      gradient: "from-red-500 to-orange-600",
      category: "friend-compatibility",
      free: false
    },
    {
      icon: "☁️",
      title: "Dream interpreter",
      description: "Unlock the secrets of your dreams",
      gradient: "from-orange-500 to-red-500",
      category: "dream-interpreter",
      free: false
    },
    {
      icon: "⭐",
      title: "Astrological events",
      description: "Important cosmic happenings",
      gradient: "from-red-600 to-orange-500",
      category: "astrological-events",
      free: false
    },
    {
      icon: "☀️",
      title: "Tarot card interpreter",
      description: "Divine insights through tarot",
      gradient: "from-orange-600 to-red-600",
      category: "tarot-interpreter",
      free: false
    },
    {
      icon: "🪁",
      title: "Personal growth",
      description: "Develop your highest potential",
      gradient: "from-red-500 to-orange-400",
      category: "personal-growth",
      free: false
    }
  ];

  useEffect(() => {
    checkExistingProfile();
  }, [user]);

  // Real-time listener for user data updates
  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserData(data);
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  const checkExistingProfile = async () => {
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          
          if (data.name && data.dateOfBirth) {
            // User has completed profile
            if (data.hasAcceptedTrial) {
              setCurrentScreen('dashboard');
            } else {
              setCurrentScreen('trial');
            }
          } else {
            // User needs to complete onboarding
            setCurrentScreen('onboarding');
          }
        } else {
          // New user - start onboarding
          setCurrentScreen('onboarding');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setCurrentScreen('onboarding');
      }
    }
    setLoading(false);
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen('trial');
  };

  const handleTrialAccept = async (notifyPreference) => {
    try {
      // Update user profile with trial acceptance
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        hasAcceptedTrial: true,
        notifyBeforeTrialEnd: notifyPreference,
        trialStartDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Refresh user data
      await checkExistingProfile();
    } catch (error) {
      console.error('Error accepting trial:', error);
      setCurrentScreen('dashboard');
    }
  };

  const handleTrialSkip = () => {
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfileClick = () => {
    setCurrentScreen('profile');
  };

  const handleHistoryClick = () => {
    setCurrentScreen('history');
  };

  const handleSoulmateClick = () => {
    setCurrentScreen('soulmate-generator');
  };

  const handleOpenConversation = (conversation) => {
    setSelectedConversation(conversation);
    setCurrentChatCategory(conversation.category);
    setCurrentScreen('chat');
  };

  // Updated feature click handler with hidden premium gating
  const handleFeatureClick = (feature) => {
    // Check if feature requires premium access (silently)
    if (!feature.free && !isPremiumUser(userData)) {
      alert('This feature requires a premium subscription. Upgrade to unlock all cosmic insights!');
      setCurrentScreen('trial');
      return;
    }

    // Original logic for accessible features
    if (feature.category === 'soulmate-generator') {
      setCurrentScreen('soulmate-generator');
    } else if (feature.category === 'personal-growth') {
      // For personal growth, we can use a special chat interface or separate component
      setCurrentChatCategory('ask-anything'); // For now, treat as general chat
      setSelectedConversation(null); // Start new conversation
      setCurrentScreen('chat');
    } else {
      // All other features open chat interface with specific category
      setCurrentChatCategory(feature.category);
      setSelectedConversation(null); // Start new conversation
      setCurrentScreen('chat');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setCurrentChatCategory(null);
    setSelectedConversation(null);
    
    // Refresh user data when returning to dashboard
    checkExistingProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center relative overflow-hidden">
        {/* Ambient Lighting */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/5 via-orange-500/2 to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-orange-500/3 via-red-500/1 to-transparent blur-3xl"></div>
        </div>
        
        <div className="text-center text-white px-4 relative z-10">
          <div className="text-4xl sm:text-6xl mb-4">✨</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm sm:text-base">Loading Ask the Stars...</p>
        </div>
        
        <style jsx>{`
          .bg-gradient-radial {
            background: radial-gradient(circle, var(--tw-gradient-stops));
          }
        `}</style>
      </div>
    );
  }

  if (currentScreen === 'onboarding') {
    return <ConversationalOnboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  if (currentScreen === 'trial') {
    return <TrialSignup user={user} onAccept={handleTrialAccept} onSkip={handleTrialSkip} />;
  }

  if (currentScreen === 'profile') {
    return (
      <UserProfile
        user={user}
        userData={userData}
        onBack={handleBackToDashboard}
        onEditProfile={checkExistingProfile}
      />
    );
  }

  if (currentScreen === 'history') {
    return (
      <ConversationHistory
        user={user}
        userData={userData}
        onBack={handleBackToDashboard}
        onOpenConversation={handleOpenConversation}
      />
    );
  }

  if (currentScreen === 'results') {
    return (
      <SoulmateResults 
        user={user} 
        userData={userData} 
        onBack={() => setCurrentScreen('dashboard')} 
      />
    );
  }

  if (currentScreen === 'chat') {
    return (
      <ChatInterface
        category={currentChatCategory}
        user={user}
        userData={userData}
        onBack={handleBackToDashboard}
        existingConversation={selectedConversation}
      />
    );
  }

  if (currentScreen === 'soulmate-generator') {
    return (
      <SoulmateGenerator
        user={user}
        userData={userData}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/5 via-orange-500/2 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-orange-500/3 via-red-500/1 to-transparent blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-radial from-orange-400/3 to-transparent blur-3xl"></div>
      </div>

      {/* Floating Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-0.5 h-0.5 bg-gradient-to-r from-white via-orange-400 to-red-500 rounded-full animate-float shadow-sm shadow-orange-400/20`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 safe-area-top relative z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button 
            onClick={handleHistoryClick}
            className="p-2 touch-manipulation active:scale-95 transition-transform rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 justify-center">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-red-500 flex-shrink-0"
            />
            <span className="text-sm sm:text-base font-medium truncate">
              Hi, {userData?.name || user.displayName?.split(' ')[0]}!
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 touch-manipulation active:scale-95 transition-all rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="p-3 sm:p-4 max-w-lg mx-auto relative z-10">
        <div className="space-y-2 sm:space-y-3">
          {dashboardFeatures.map((feature, index) => (
            <button
              key={index}
              onClick={() => handleFeatureClick(feature)}
              className="w-full bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 hover:bg-gray-800 active:bg-gray-750 rounded-2xl p-3 sm:p-4 transition-all duration-200 border border-gray-700 hover:border-red-500/40 group touch-manipulation active:scale-[0.98] backdrop-blur-xl"
            >
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 group-active:scale-105 transition-transform duration-200 flex-shrink-0 shadow-lg`}>
                  <span className="text-lg sm:text-xl">{feature.icon}</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-white font-semibold text-sm sm:text-lg leading-tight group-hover:bg-gradient-to-r group-hover:from-red-400 group-hover:to-orange-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">{feature.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mt-0.5">{feature.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 -z-10"></div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 safe-area-bottom z-30">
        <div className="px-4 py-3 pb-safe">
          <div className="flex justify-center max-w-lg mx-auto">
            <div className="flex items-center justify-center space-x-12 sm:space-x-16">
              <button className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full touch-manipulation active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:from-red-400 hover:to-orange-400">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              
              <button 
                onClick={handleProfileClick}
                className="p-3 touch-manipulation active:scale-95 transition-all duration-200 rounded-full hover:bg-gray-800"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add bottom padding to account for fixed navigation */}
      <div className="h-16 sm:h-20"></div>

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