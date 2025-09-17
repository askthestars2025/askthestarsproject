import { useState, useEffect } from 'react';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import ContactUs from './ContactUs';
import SubscriptionManagement from './SubscriptionManagement'; // Add this import

export default function UserProfile({ user, userData, onBack, onEditProfile }) {
  const [currentView, setCurrentView] = useState('profile'); // Add 'subscription' to the possible views
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    birthPlace: ''
  });
  const [loading, setLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (userData) {
      setEditData({
        name: userData.name || '',
        dateOfBirth: userData.dateOfBirth || '',
        timeOfBirth: userData.timeOfBirth || '',
        birthPlace: userData.birthPlace || ''
      });
    }
  }, [userData]);

  const getZodiacSign = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
    return '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        ...editData,
        updatedAt: new Date().toISOString()
      });
      
      setShowEditModal(false);
      if (onEditProfile) {
        onEditProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced delete account function with complete data cleanup
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting account deletion process...');

      // Step 1: Delete all user conversations
      try {
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('userId', '==', user.uid)
        );
        const conversationsSnapshot = await getDocs(conversationsQuery);
        console.log(`Found ${conversationsSnapshot.docs.length} conversations to delete`);
        
        const conversationDeletePromises = conversationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(conversationDeletePromises);
        console.log('All conversations deleted');
      } catch (error) {
        console.log('Error deleting conversations:', error);
      }
      
      // Step 2: Delete soulmate data if exists
      try {
        await deleteDoc(doc(db, 'soulmates', user.uid));
        console.log('Soulmate data deleted');
      } catch (error) {
        console.log('No soulmate data to delete');
      }

      // Step 3: Delete any transaction records for this user
      try {
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const transactionSnapshot = await getDocs(transactionsQuery);
        console.log(`Found ${transactionSnapshot.docs.length} transactions to delete`);
        
        const transactionDeletePromises = transactionSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(transactionDeletePromises);
        console.log('All transactions deleted');
      } catch (error) {
        console.log('No transaction data to delete');
      }
      
      // Step 4: Delete main user document
      await deleteDoc(doc(db, 'users', user.uid));
      console.log('User document deleted');
      
      // Step 5: Clear any session storage
      try {
        // Clear any cached conversation data
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.includes(user.uid) || key.startsWith('askthestars_chat_')) {
            sessionStorage.removeItem(key);
          }
        });
        console.log('Session storage cleared');
      } catch (error) {
        console.log('Error clearing session storage:', error);
      }
      
      // Step 6: Delete Firebase Auth user account (this will automatically sign them out)
      await deleteUser(user);
      console.log('Firebase Auth user deleted - user will be automatically signed out');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      
      // Provide more specific error messages
      if (error.code === 'auth/requires-recent-login') {
        alert('For security reasons, please sign out and sign back in, then try deleting your account again.');
      } else if (error.code === 'permission-denied') {
        alert('Permission denied. Please contact support at info@askthestarsapp.com for assistance.');
      } else {
        alert('Failed to delete account. Please try again or contact support at info@askthestarsapp.com');
      }
      
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBackToProfile = () => {
    setCurrentView('profile');
  };

  // Show Subscription Management page
  if (currentView === 'subscription') {
    return (
      <SubscriptionManagement 
        user={user} 
        userData={userData} 
        onBack={handleBackToProfile} 
      />
    );
  }

  // Show Terms of Service page
  if (currentView === 'terms') {
    return <TermsOfService onBack={handleBackToProfile} />;
  }

  // Show Privacy Policy page
  if (currentView === 'privacy') {
    return <PrivacyPolicy onBack={handleBackToProfile} />;
  }

  // Show Contact Us page
  if (currentView === 'contact') {
    return <ContactUs onBack={handleBackToProfile} />;
  }

  const menuItems = [
    {
      icon: '✏️',
      title: 'Edit My Information',
      description: 'Update your cosmic profile details',
      action: () => setShowEditModal(true)
    },
    {
      icon: '💳',
      title: 'Subscription',
      description: 'Manage your Ask the Stars subscription',
      action: () => setCurrentView('subscription') // Updated to navigate to subscription page
    },
    {
      icon: '📞',
      title: 'Contact Us',
      description: 'Get help from our cosmic support team',
      action: () => setCurrentView('contact')
    },
    {
      icon: '📋',
      title: 'Terms of Service',
      description: 'Read our terms and conditions',
      action: () => setCurrentView('terms')
    },
    {
      icon: '🔒',
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      action: () => setCurrentView('privacy')
    },
    {
      icon: '🚪',
      title: 'Sign Out',
      description: 'Log out of your account',
      action: handleLogout
    },
    {
      icon: '🗑️',
      title: 'Delete Account',
      description: 'Permanently remove your account',
      action: () => setShowDeleteConfirm(true),
      danger: true
    }
  ];

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
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-gradient-to-r from-white via-orange-400 to-red-500 rounded-full animate-float shadow-sm shadow-orange-400/20"
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
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 touch-manipulation active:scale-95 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Profile & Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-3 sm:p-4 max-w-lg mx-auto relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative mb-4">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto ring-2 ring-red-500"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold mb-1">{userData?.name || user.displayName}</h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-2">{user.email}</p>
          {userData?.dateOfBirth && (
            <div className="inline-flex items-center space-x-2 bg-red-900/30 border border-red-700/50 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs">
              <span className="bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
                {getZodiacSign(userData.dateOfBirth)} • {formatDate(userData.dateOfBirth)}
              </span>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-2 sm:space-y-3">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`w-full bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-4 transition-all duration-200 border hover:scale-[1.02] touch-manipulation active:scale-[0.98] ${
                item.danger 
                  ? 'border-red-600/40 hover:border-red-500/60' 
                  : 'border-gray-700 hover:border-red-500/40'
              }`}
            >
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                  item.danger 
                    ? 'bg-gradient-to-br from-red-600 to-red-700' 
                    : 'bg-gradient-to-br from-red-500 to-orange-500'
                } shadow-lg flex-shrink-0`}>
                  <span className="text-lg sm:text-xl">{item.icon}</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className={`font-semibold text-sm sm:text-base ${item.danger ? 'text-red-400' : 'text-white'}`}>
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mt-0.5">{item.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* App Version */}
        <div className="text-center mt-6 sm:mt-8 text-gray-500 text-xs">
          Ask the Stars v1.0.0
        </div>
      </div>

      {/* Add bottom padding to account for mobile safe areas */}
      <div className="h-4 sm:h-6"></div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-900/90 backdrop-blur-xl border border-red-500/40 rounded-2xl p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Edit Your Information
            </h3>
            
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:py-2.5 border border-gray-700 focus:border-red-500 focus:outline-none text-sm sm:text-base"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2">Birth Date</label>
                <input
                  type="date"
                  value={editData.dateOfBirth}
                  onChange={(e) => setEditData({...editData, dateOfBirth: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:py-2.5 border border-gray-700 focus:border-red-500 focus:outline-none text-sm sm:text-base"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2">Birth Time</label>
                <input
                  type="time"
                  value={editData.timeOfBirth}
                  onChange={(e) => setEditData({...editData, timeOfBirth: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:py-2.5 border border-gray-700 focus:border-red-500 focus:outline-none text-sm sm:text-base"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2">Birth Place</label>
                <input
                  type="text"
                  value={editData.birthPlace}
                  onChange={(e) => setEditData({...editData, birthPlace: e.target.value})}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:py-2.5 border border-gray-700 focus:border-red-500 focus:outline-none text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-700 text-white py-2.5 sm:py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white py-2.5 sm:py-3 rounded-full font-semibold hover:from-red-600 hover:to-orange-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-900/90 backdrop-blur-xl border border-red-500/40 rounded-2xl p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-red-400">Delete Account</h3>
            <p className="text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
              This action cannot be undone. All your data will be permanently deleted including:
            </p>
            <ul className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 list-disc pl-5 space-y-1">
              <li>Your cosmic profile and personal information</li>
              <li>All conversation history</li>
              <li>Soulmate matches and compatibility data</li>
              <li>Transaction records and subscription data</li>
            </ul>
            <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 sm:py-2.5 mb-4 sm:mb-6 border border-red-600 focus:border-red-500 focus:outline-none font-mono text-sm sm:text-base"
              placeholder="DELETE"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 bg-gray-700 text-white py-2.5 sm:py-3 rounded-full font-semibold hover:bg-gray-600 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-red-600 text-white py-2.5 sm:py-3 rounded-full font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

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