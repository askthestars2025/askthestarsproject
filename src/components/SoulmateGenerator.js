import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateSoulmateImagePrompt, generateSoulmateImage } from '../lib/gemini';

export default function SoulmateGenerator({ user, userData, onBack }) {
  const [stage, setStage] = useState('loading'); // loading, calculating-chart, generating, complete, error
  const [soulmateImage, setSoulmateImage] = useState(null);
  const [birthChart, setBirthChart] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const loadingMessages = [
    "Analyzing your cosmic energy...",
    "Calculating precise planetary positions...",
    "Consulting the stars...", 
    "Reading your birth chart...",
    "Channeling cosmic vibrations...",
    "Creating your soulmate profile...",
    "Generating your perfect match...",
    "Almost ready to reveal..."
  ];

  useEffect(() => {
    checkExistingSoulmate();
  }, [user]);

  const checkExistingSoulmate = async () => {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.soulmatePortrait?.imageUrl) {
          setSoulmateImage({
            url: data.soulmatePortrait.imageUrl,
            prompt: data.soulmatePortrait.prompt,
            seed: data.soulmatePortrait.seed,
            enhancedWithAstrology: data.soulmatePortrait.enhancedWithAstrology || false
          });
          setStage('complete');
          return;
        }
      }
      
      // No existing soulmate, start generation
      startGeneration();
    } catch (error) {
      console.error('Error checking existing soulmate:', error);
      startGeneration();
    }
  };

  const startGeneration = async () => {
    setStage('generating');
    setProgress(0);
    
    // Simulate loading progression
    let currentMessage = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 12, 85);
        
        // Update loading message
        const messageIndex = Math.floor(newProgress / 12);
        if (messageIndex < loadingMessages.length && messageIndex !== currentMessage) {
          setLoadingMessage(loadingMessages[messageIndex]);
          currentMessage = messageIndex;
        }
        
        return newProgress;
      });
    }, 1000);

    try {
      // NEW: Enhanced user data with birth chart calculation
      let enhancedUserData = userData;
      let usedSwissEphemeris = false;
      
      // Try to calculate birth chart for enhanced accuracy
      if (userData.dateOfBirth && userData.timeOfBirth && userData.birthPlace) {
        try {
          setLoadingMessage("Calculating precise planetary positions...");
          setStage('calculating-chart');
          
          const chartResponse = await fetch('/api/birth-chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dateOfBirth: userData.dateOfBirth,
              timeOfBirth: userData.timeOfBirth,
              birthPlace: userData.birthPlace
            })
          });
          
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            setBirthChart(chartData);
            enhancedUserData = { 
              ...userData, 
              birthChart: chartData 
            };
            usedSwissEphemeris = true;
            setLoadingMessage("Using Swiss Ephemeris calculations...");
            console.log('Enhanced with Swiss Ephemeris birth chart');
          } else {
            console.log('Birth chart calculation failed, using basic astrological data');
          }
        } catch (chartError) {
          console.log('Chart calculation failed, continuing with basic data:', chartError);
          // Continue with basic userData if chart calculation fails
        }
      }

      setProgress(40);
      setStage('generating');
      setLoadingMessage("Creating your cosmic match profile...");

      // Generate the actual soulmate image using enhanced or basic data
      const imagePrompt = await generateSoulmateImagePrompt(enhancedUserData);
      
      setProgress(70);
      setLoadingMessage("Generating your soulmate portrait...");
      
      const imageResult = await generateSoulmateImage(imagePrompt);
      
      const portraitData = {
        url: imageResult.imageUrl,
        prompt: imagePrompt,
        seed: imageResult.seed,
        enhancedWithAstrology: usedSwissEphemeris
      };
      
      setSoulmateImage(portraitData);
      
      // Save to Firestore
      await saveSoulmatePortrait({
        imageUrl: imageResult.imageUrl,
        prompt: imagePrompt,
        seed: imageResult.seed,
        enhancedWithAstrology: usedSwissEphemeris,
        birthChartUsed: !!birthChart
      });
      
      // Complete the progress
      clearInterval(progressInterval);
      setProgress(100);
      setLoadingMessage(usedSwissEphemeris ? "Your astrologically-matched soulmate is ready!" : "Your soulmate is ready!");
      
      // Short delay before revealing
      setTimeout(() => {
        setStage('complete');
      }, 1500);
      
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setStage('error');
    }
  };

  const saveSoulmatePortrait = async (portraitData) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        soulmatePortrait: {
          ...portraitData,
          generatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving soulmate portrait:', error);
      throw new Error('Failed to save portrait');
    }
  };

  const handleRegenerateClick = () => {
    setSoulmateImage(null);
    setBirthChart(null);
    setError('');
    startGeneration();
  };

  if (stage === 'loading' || stage === 'calculating-chart' || stage === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Enhanced Ambient Lighting for chart calculation */}
        <div className="fixed inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial ${stage === 'calculating-chart' ? 'from-purple-500/8 via-blue-500/4' : 'from-red-500/8 via-orange-500/4'} to-transparent blur-3xl`}></div>
          <div className={`absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial ${stage === 'calculating-chart' ? 'from-blue-500/6 via-purple-500/3' : 'from-orange-500/6 via-red-500/3'} to-transparent blur-3xl`}></div>
          <div className={`absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-radial ${stage === 'calculating-chart' ? 'from-indigo-400/5' : 'from-orange-400/5'} to-transparent blur-3xl`}></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-20 left-10 w-2 h-2 bg-gradient-to-r from-white ${stage === 'calculating-chart' ? 'to-purple-400' : 'to-orange-400'} rounded-full animate-pulse opacity-60`}></div>
          <div className={`absolute top-32 right-20 w-1 h-1 bg-gradient-to-r from-white ${stage === 'calculating-chart' ? 'to-blue-400' : 'to-red-400'} rounded-full animate-pulse delay-300 opacity-40`}></div>
          <div className={`absolute bottom-40 left-20 w-3 h-3 bg-gradient-to-r from-white ${stage === 'calculating-chart' ? 'to-indigo-500' : 'to-orange-500'} rounded-full animate-pulse delay-700 opacity-50`}></div>
          <div className={`absolute bottom-60 right-10 w-1 h-1 bg-gradient-to-r from-white ${stage === 'calculating-chart' ? 'to-purple-500' : 'to-red-500'} rounded-full animate-pulse delay-1000 opacity-30`}></div>
          <div className={`absolute top-1/2 left-1/4 w-1 h-1 bg-gradient-to-r from-white ${stage === 'calculating-chart' ? 'to-blue-400' : 'to-orange-400'} rounded-full animate-pulse delay-500 opacity-40`}></div>
          <div className={`absolute top-1/3 right-1/3 w-2 h-2 bg-gradient-to-r from-white ${stage === 'calculating-chart' ? 'to-purple-400' : 'to-red-400'} rounded-full animate-pulse delay-200 opacity-60`}></div>
        </div>

        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="relative z-10 text-center max-w-md mx-auto px-6">
          {/* Enhanced Cosmic Symbol */}
          <div className="mb-8">
            <div className="relative">
              <div className="text-8xl animate-bounce mb-4 filter drop-shadow-lg">
                {stage === 'calculating-chart' ? '🔮' : '💎'}
              </div>
              <div className={`absolute -top-4 -left-4 text-2xl animate-spin ${stage === 'calculating-chart' ? '🌟' : '✨'}`}></div>
              <div className={`absolute -top-2 -right-6 text-xl animate-ping ${stage === 'calculating-chart' ? 'text-purple-400' : 'text-orange-400'}`}>
                {stage === 'calculating-chart' ? '⭐' : '⭐'}
              </div>
              <div className={`absolute -bottom-2 left-2 text-lg animate-pulse ${stage === 'calculating-chart' ? 'text-blue-400' : 'text-red-400'}`}>
                {stage === 'calculating-chart' ? '🌙' : '🌟'}
              </div>
            </div>
          </div>

          {/* Enhanced Title */}
          <h1 className={`text-3xl md:text-4xl font-light mb-6 tracking-wide bg-gradient-to-r ${stage === 'calculating-chart' ? 'from-white via-purple-200 to-blue-300' : 'from-white via-orange-200 to-red-300'} bg-clip-text text-transparent`}>
            {stage === 'calculating-chart' ? 'Calculating Your Birth Chart' : 'Generating Your Soulmate'}
          </h1>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-gray-800 rounded-full h-2 mb-4 border border-gray-700">
              <div 
                className={`bg-gradient-to-r ${stage === 'calculating-chart' ? 'from-purple-500 to-blue-500' : 'from-red-500 to-orange-500'} h-2 rounded-full transition-all duration-500 ease-out shadow-lg ${stage === 'calculating-chart' ? 'shadow-purple-500/30' : 'shadow-red-500/30'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className={`bg-gradient-to-r ${stage === 'calculating-chart' ? 'from-purple-400 to-blue-400' : 'from-red-400 to-orange-400'} bg-clip-text text-transparent text-sm font-medium`}>
              {Math.round(progress)}% Complete
            </div>
          </div>

          {/* Loading Message */}
          <div className="mb-8">
            <p className="text-xl text-gray-300 leading-relaxed animate-pulse">
              {loadingMessage || loadingMessages[0]}
            </p>
            {stage === 'calculating-chart' && (
              <p className="text-sm text-gray-500 mt-2">
                Using precise Swiss Ephemeris calculations...
              </p>
            )}
          </div>

          {/* Floating Elements */}
          <div className="flex justify-center space-x-8 text-2xl">
            <div className="animate-bounce delay-0 filter drop-shadow-sm">
              {stage === 'calculating-chart' ? '🪐' : '🔮'}
            </div>
            <div className="animate-bounce delay-150 filter drop-shadow-sm">
              {stage === 'calculating-chart' ? '🌌' : '🌙'}
            </div>
            <div className="animate-bounce delay-300 filter drop-shadow-sm">⚡</div>
          </div>

          {/* Cosmic Energy Indicator */}
          <div className="mt-8">
            <div className="flex justify-center space-x-1">
              <div className={`w-2 h-2 ${stage === 'calculating-chart' ? 'bg-purple-500' : 'bg-red-500'} rounded-full animate-pulse shadow-sm ${stage === 'calculating-chart' ? 'shadow-purple-500/50' : 'shadow-red-500/50'}`}></div>
              <div className={`w-2 h-2 ${stage === 'calculating-chart' ? 'bg-blue-400' : 'bg-orange-400'} rounded-full animate-pulse delay-100 shadow-sm ${stage === 'calculating-chart' ? 'shadow-blue-400/50' : 'shadow-orange-400/50'}`}></div>
              <div className={`w-2 h-2 ${stage === 'calculating-chart' ? 'bg-indigo-600' : 'bg-red-600'} rounded-full animate-pulse delay-200 shadow-sm ${stage === 'calculating-chart' ? 'shadow-indigo-600/50' : 'shadow-red-600/50'}`}></div>
              <div className={`w-2 h-2 ${stage === 'calculating-chart' ? 'bg-purple-500' : 'bg-orange-500'} rounded-full animate-pulse delay-300 shadow-sm ${stage === 'calculating-chart' ? 'shadow-purple-500/50' : 'shadow-orange-500/50'}`}></div>
              <div className={`w-2 h-2 ${stage === 'calculating-chart' ? 'bg-blue-400' : 'bg-red-500'} rounded-full animate-pulse delay-400 shadow-sm ${stage === 'calculating-chart' ? 'shadow-blue-400/50' : 'shadow-red-500/50'}`}></div>
            </div>
            {birthChart && (
              <p className="text-xs text-gray-500 mt-3">
                Birth chart calculated ✓ Generating enhanced match...
              </p>
            )}
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

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Ambient Lighting */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/5 via-orange-500/2 to-transparent blur-3xl"></div>
        </div>

        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center max-w-md relative z-10">
          <div className="text-6xl mb-6">😔</div>
          <h2 className="text-2xl font-bold mb-4">Cosmic Interference</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={handleRegenerateClick}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/30"
          >
            Try Again
          </button>
        </div>

        <style jsx>{`
          .bg-gradient-radial {
            background: radial-gradient(circle, var(--tw-gradient-stops));
          }
        `}</style>
      </div>
    );
  }

  // Complete stage - show soulmate image
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/5 via-orange-500/2 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-orange-500/3 via-red-500/1 to-transparent blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 p-4 relative z-20">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button 
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Your Soulmate</h1>
          <div></div>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto relative z-10">
        {/* Success Animation */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2 animate-bounce filter drop-shadow-lg">✨</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {soulmateImage?.enhancedWithAstrology ? 'Astrologically Matched Soulmate!' : 'Your Soulmate Revealed!'}
          </h2>
          <p className="text-gray-400 text-sm">
            {soulmateImage?.enhancedWithAstrology ? 'Generated using Swiss Ephemeris calculations' : 'The cosmos has spoken'}
          </p>
        </div>

        {/* Soulmate Image */}
        {soulmateImage && (
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl blur-lg opacity-30"></div>
            <div className="relative bg-black rounded-3xl p-1 border border-red-500/50">
              <img 
                src={soulmateImage.url} 
                alt="Your Soulmate" 
                className="w-full h-80 object-cover rounded-3xl shadow-2xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-80 bg-gradient-to-br from-red-900 to-orange-900 rounded-3xl items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-4xl mb-2">👤</div>
                  <div className="text-sm">Your Cosmic Match</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cosmic Compatibility */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 rounded-2xl p-6 backdrop-blur-sm border border-red-600/30 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
              {soulmateImage?.enhancedWithAstrology ? '99%' : '97%'} Soul Match
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {soulmateImage?.enhancedWithAstrology 
                ? 'This connection is based on precise planetary calculations from your birth chart. Your cosmic energies are perfectly aligned for lasting love.'
                : 'Your cosmic energies are perfectly aligned. This connection transcends the physical realm and touches the very essence of your souls.'
              }
            </p>
          </div>
        </div>

        

        {/* Mystical Elements */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-4 text-2xl opacity-60">
            <div className="animate-pulse">🌙</div>
            <div className="animate-pulse delay-300">⭐</div>
            <div className="animate-pulse delay-500">🔮</div>
            <div className="animate-pulse delay-700">✨</div>
          </div>
          <p className="text-gray-500 text-xs mt-3 italic">
            {soulmateImage?.enhancedWithAstrology 
              ? '"The stars have aligned for your perfect match" - Swiss Ephemeris'
              : '"When you know, you know" - The Universe'
            }
          </p>
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