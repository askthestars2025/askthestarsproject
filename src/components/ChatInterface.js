// components/ChatInterface.js - Updated version with Swiss Ephemeris debugging
import { useState, useEffect, useRef } from 'react';
import { generateChatResponse } from '../lib/gemini';
import { saveConversationToFirebase, updateConversationInFirebase } from '../lib/conversationHistory';

export default function ChatInterface({ category, user, userData, onBack, existingConversation = null }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const categoryConfig = {
    'ask-anything': {
      title: 'Ask me anything',
      icon: '🎱',
      welcomeMessage: "Hi! I'm your cosmic guide. Ask me anything about your life, relationships, career, or future!",
      suggestions: [
        "What does my future hold?",
        "How can I improve my relationships?",
        "What career path is best for me?",
        "When will I find love?",
        "What are my hidden talents?",
        "How can I overcome my challenges?"
      ]
    },
    'daily-horoscope': {
      title: 'Daily horoscope',
      icon: '🔮',
      welcomeMessage: "Welcome to your personalized daily horoscope! Let me know what you'd like to explore today.",
      suggestions: [
        "What's my horoscope for today?",
        "How are the planets affecting me?",
        "What should I focus on today?",
        "Any lucky opportunities today?",
        "How is Mercury retrograde affecting me?",
        "What's my love forecast for today?"
      ]
    },
    'romantic-compatibility': {
      title: 'Romantic compatibility',
      icon: '🌹',
      welcomeMessage: "Let's explore your romantic compatibility! I can help you understand relationships and love connections.",
      suggestions: [
        "Am I compatible with a Scorpio?",
        "What's my ideal partner like?",
        "How can I improve my relationship?",
        "When will I meet my soulmate?",
        "What signs am I most compatible with?",
        "How do I know if someone likes me?"
      ]
    },
    'friend-compatibility': {
      title: 'Friend compatibility',
      icon: '🤝',
      welcomeMessage: "Let's talk about friendships! I can help you understand your social connections and compatibility.",
      suggestions: [
        "How can I make better friends?",
        "Why do I clash with certain people?",
        "What makes a good friendship for me?",
        "How can I resolve friend conflicts?",
        "What type of people should I avoid?",
        "How to be a better friend?"
      ]
    },
    'dream-interpreter': {
      title: 'Dream interpreter',
      icon: '☁️',
      welcomeMessage: "Tell me about your dreams and I'll help you understand their cosmic meaning!",
      suggestions: [
        "I dreamed about flying, what does it mean?",
        "What does dreaming of water signify?",
        "I had a dream about my ex, meaning?",
        "Dreaming of animals - interpretation?",
        "What do recurring dreams mean?",
        "I dreamed about death, should I worry?"
      ]
    },
    'astrological-events': {
      title: 'Astrological events',
      icon: '⭐',
      welcomeMessage: "Let's explore current astrological events and how they affect you personally!",
      suggestions: [
        "How does the full moon affect me?",
        "What's happening astrologically this month?",
        "How do eclipses impact my life?",
        "When is the next Mercury retrograde?",
        "What planetary transits affect me?",
        "Best times for new beginnings?"
      ]
    },
    'tarot-interpreter': {
      title: 'Tarot card interpreter',
      icon: '☀️',
      welcomeMessage: "I can help interpret tarot cards and provide cosmic guidance through the cards!",
      suggestions: [
        "What does The Fool card mean?",
        "Interpret a 3-card spread for me",
        "What's my card of the day?",
        "Meaning of The Tower card?",
        "How to read tarot for love?",
        "What do court cards represent?"
      ]
    },
    'personal-growth': {
      title: 'Personal growth',
      icon: '🪁',
      welcomeMessage: "Let's explore your path to personal development and reaching your highest potential!",
      suggestions: [
        "How can I grow spiritually?",
        "What are my life lessons?",
        "How to overcome my fears?",
        "What is my life purpose?",
        "How to build confidence?",
        "What should I focus on improving?"
      ]
    }
  };

  const config = categoryConfig[category] || categoryConfig['ask-anything'];

  // Helper function to get zodiac sign
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

  // NEW: Swiss Ephemeris debugging functions
  const testSwissEphemeris = async () => {
    console.log('🧪 Testing Swiss Ephemeris with user data:', {
      name: userData?.name,
      dateOfBirth: userData?.dateOfBirth,
      timeOfBirth: userData?.timeOfBirth,
      birthPlace: userData?.birthPlace,
      category: category
    });
    
    if (!userData?.dateOfBirth || !userData?.timeOfBirth || !userData?.birthPlace) {
      const missingData = [];
      if (!userData?.dateOfBirth) missingData.push('dateOfBirth');
      if (!userData?.timeOfBirth) missingData.push('timeOfBirth');
      if (!userData?.birthPlace) missingData.push('birthPlace');
      
      console.warn('❌ Missing required birth data:', missingData);
      setDebugInfo({
        status: 'error',
        message: `Missing required data: ${missingData.join(', ')}`,
        userData: userData
      });
      return;
    }
    
    try {
      setDebugInfo({ status: 'loading', message: 'Testing birth chart API...' });
      
      const response = await fetch('/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: userData.dateOfBirth,
          timeOfBirth: userData.timeOfBirth,
          birthPlace: userData.birthPlace
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('🔮 Swiss Ephemeris result:', result);
        setDebugInfo({
          status: 'success',
          message: 'Swiss Ephemeris working correctly!',
          data: result,
          planets: result.planets,
          ascendant: result.ascendant
        });
      } else {
        console.error('❌ Birth chart API error:', result);
        setDebugInfo({
          status: 'error',
          message: `API Error: ${result.error}`,
          details: result
        });
      }
    } catch (error) {
      console.error('❌ Swiss Ephemeris test failed:', error);
      setDebugInfo({
        status: 'error',
        message: `Network Error: ${error.message}`,
        error: error
      });
    }
  };

  const testCurrentTransits = async () => {
    try {
      setDebugInfo({ status: 'loading', message: 'Testing current transits...' });
      
      const response = await fetch('/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTransits: true })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('🌟 Current transits:', result);
        setDebugInfo({
          status: 'success',
          message: 'Current transits working!',
          data: result,
          currentDate: result.currentDate,
          planets: result.planets
        });
      } else {
        setDebugInfo({
          status: 'error',
          message: `Transits Error: ${result.error}`,
          details: result
        });
      }
    } catch (error) {
      setDebugInfo({
        status: 'error',
        message: `Transits Error: ${error.message}`,
        error: error
      });
    }
  };

  // Initialize conversation
  useEffect(() => {
    if (existingConversation) {
      // Load existing conversation from Firebase
      setMessages(existingConversation.messages || []);
      setCurrentConversationId(existingConversation.id);
      setSuggestions([]); // No suggestions for existing conversations
    } else {
      // Check sessionStorage first for ongoing conversation
      const conversationKey = `askthestars_chat_${category}_${user.uid}`;
      const savedConversation = sessionStorage.getItem(conversationKey);
      
      if (savedConversation) {
        const parsed = JSON.parse(savedConversation);
        setMessages(parsed);
        const hasUserMessages = parsed.some(msg => msg.type === 'user');
        if (!hasUserMessages) {
          setSuggestions(config.suggestions);
        }
      } else {
        // Start new conversation
        const welcomeMessage = {
          sender: "Ask the Stars",
          content: config.welcomeMessage,
          type: 'bot',
          timestamp: Date.now()
        };
        setMessages([welcomeMessage]);
        setSuggestions(config.suggestions);
        
        sessionStorage.setItem(conversationKey, JSON.stringify([welcomeMessage]));
      }
    }

    // Log user data on component mount for debugging
    console.log('🔍 ChatInterface loaded with user data:', {
      name: userData?.name,
      dateOfBirth: userData?.dateOfBirth,
      timeOfBirth: userData?.timeOfBirth,
      birthPlace: userData?.birthPlace,
      category: category,
      hasCompleteData: userData?.dateOfBirth && userData?.timeOfBirth && userData?.birthPlace
    });
  }, [category, user.uid, existingConversation]);

  // Save to both sessionStorage and Firebase
  useEffect(() => {
    if (messages.length > 0) {
      // Save to sessionStorage for immediate access
      const conversationKey = `askthestars_chat_${category}_${user.uid}`;
      sessionStorage.setItem(conversationKey, JSON.stringify(messages));
      
      // Save to Firebase for persistent history (only if there are user messages)
      const hasUserMessages = messages.some(msg => msg.type === 'user');
      if (hasUserMessages) {
        const saveToFirebase = async () => {
          if (!currentConversationId) {
            // Create new conversation in Firebase
            const newId = await saveConversationToFirebase(user.uid, category, messages);
            if (newId) {
              setCurrentConversationId(newId);
            }
          } else {
            // Update existing conversation
            await updateConversationInFirebase(currentConversationId, messages);
          }
        };
        
        saveToFirebase();
      }
    }
  }, [messages, category, user.uid, currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  };

  const addMessage = (sender, content, type = 'user') => {
    const newMessage = { sender, content, type, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(scrollToBottom, 50);
  };

  const generateAIResponse = async (userMessage) => {
    setIsTyping(true);
    
    try {
      // Enhanced debugging for Swiss Ephemeris
      console.log('🚀 Generating AI response with:');
      console.log('📝 User message:', userMessage);
      console.log('📂 Category:', category);
      console.log('👤 User data:', {
        name: userData?.name,
        dateOfBirth: userData?.dateOfBirth,
        timeOfBirth: userData?.timeOfBirth,
        birthPlace: userData?.birthPlace,
        hasCompleteData: userData?.dateOfBirth && userData?.timeOfBirth && userData?.birthPlace
      });

      // Check if this category should trigger Swiss Ephemeris
      const swissEphemerisCategories = ['daily-horoscope', 'romantic-compatibility', 'astrological-events'];
      const shouldUseSwissEphemeris = swissEphemerisCategories.includes(category);
      
      console.log('🔮 Should use Swiss Ephemeris:', shouldUseSwissEphemeris);
      
      if (shouldUseSwissEphemeris && userData?.dateOfBirth && userData?.timeOfBirth && userData?.birthPlace) {
        console.log('✨ Swiss Ephemeris conditions met - enhanced astrology should be active');
      } else if (shouldUseSwissEphemeris) {
        console.warn('⚠️ Swiss Ephemeris category but missing birth data');
      }

      const conversationHistory = messages.filter(msg => msg.type !== 'welcome').map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await generateChatResponse({
        category,
        userMessage,
        userData,
        conversationHistory
      });
      
      // Check if response indicates Swiss Ephemeris was used
      if (response.includes('Enhanced with Swiss Ephemeris') || 
          response.includes('degrees') || 
          response.includes('°') ||
          response.includes('at ') && response.includes('°')) {
        console.log('🎉 Swiss Ephemeris appears to be working in response!');
      } else if (shouldUseSwissEphemeris) {
        console.warn('⚠️ Expected Swiss Ephemeris data but response seems generic');
      }
      
      addMessage("Ask the Stars", response, 'bot');
      
    } catch (err) {
      console.error('Error generating AI response:', err);
      addMessage("Ask the Stars", "I'm having trouble connecting to the cosmic realm right now. Please try asking again in a moment!", 'bot');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addMessage("You", userMessage, 'user');
    setInputValue('');
    setSuggestions([]); // Clear suggestions after first user message

    setTimeout(scrollToBottom, 100);
    await generateAIResponse(userMessage);
    setTimeout(scrollToBottom, 100);
  };

  const handleSuggestionClick = (suggestion) => {
    addMessage("You", suggestion, 'user');
    setSuggestions([]);
    setTimeout(() => {
      scrollToBottom();
      generateAIResponse(suggestion);
    }, 100);
  };

  const clearConversation = () => {
    const conversationKey = `askthestars_chat_${category}_${user.uid}`;
    sessionStorage.removeItem(conversationKey);
    
    const welcomeMessage = {
      sender: "Ask the Stars",
      content: config.welcomeMessage,
      type: 'bot',
      timestamp: Date.now()
    };
    setMessages([welcomeMessage]);
    setSuggestions(config.suggestions);
    setCurrentConversationId(null);
    sessionStorage.setItem(conversationKey, JSON.stringify([welcomeMessage]));
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-b from-black via-gray-950 to-black text-white flex flex-col relative overflow-hidden"
      style={{ 
        height: '100vh', 
        height: '100dvh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-red-500/3 via-orange-500/1 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-orange-500/2 via-red-500/1 to-transparent blur-3xl"></div>
      </div>

      {/* Floating Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
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
      <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex-shrink-0 relative z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button 
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 touch-manipulation active:scale-95 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl">{config.icon}</span>
            <h1 className="text-lg font-semibold truncate">{config.title}</h1>
          </div>
          <div className="flex items-center space-x-2">
            {/* NEW: Debug button */}
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-gray-400 hover:text-white transition-colors p-2 touch-manipulation active:scale-95 rounded-lg"
              title="Debug Swiss Ephemeris"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={clearConversation}
              className="text-gray-400 hover:text-white transition-colors p-2 -mr-2 touch-manipulation active:scale-95 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Debug Panel */}
      {showDebugPanel && (
        <div className="bg-gray-900/95 border-b border-gray-700 px-4 py-3 flex-shrink-0 relative z-40">
          <div className="max-w-lg mx-auto">
            <div className="text-xs text-gray-400 mb-2">Swiss Ephemeris Debug Panel</div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={testSwissEphemeris}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
              >
                Test Birth Chart
              </button>
              <button
                onClick={testCurrentTransits}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
              >
                Test Current Transits
              </button>
            </div>
            
            {debugInfo && (
              <div className={`text-xs p-2 rounded ${
                debugInfo.status === 'success' ? 'bg-green-900/50 text-green-300' :
                debugInfo.status === 'error' ? 'bg-red-900/50 text-red-300' :
                'bg-yellow-900/50 text-yellow-300'
              }`}>
                <div className="font-semibold mb-1">{debugInfo.message}</div>
                {debugInfo.planets && (
                  <div className="text-xs">
                    Planets: {Object.keys(debugInfo.planets).filter(p => debugInfo.planets[p]).length} calculated
                  </div>
                )}
                {debugInfo.ascendant && (
                  <div className="text-xs">
                    Ascendant: {debugInfo.ascendant.sign} {debugInfo.ascendant.degree.toFixed(1)}°
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto ${isKeyboardOpen ? 'pb-2' : 'pb-4'} relative z-10`}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth',
          maxHeight: isKeyboardOpen ? 'calc(100vh - 140px)' : 'calc(100vh - 180px)',
          touchAction: 'pan-y',
          overflowAnchor: 'none'
        }}
      >
        <div className="px-4 py-3 max-w-lg mx-auto">
          {/* Personalization indicator */}
          {userData?.name && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center space-x-2 bg-red-900/30 border border-red-700/50 rounded-full px-3 py-1.5 text-xs bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                <span className="truncate max-w-48">
                  Personalized for {userData.name} • {userData.dateOfBirth ? getZodiacSign(userData.dateOfBirth) : 'Unknown sign'}
                  {userData?.dateOfBirth && userData?.timeOfBirth && userData?.birthPlace && ' • Swiss Ephemeris'}
                </span>
              </div>
            </div>
          )}
          
          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white ml-auto' 
                    : 'bg-gray-800 text-white mr-auto border border-gray-700'
                }`}>
                  <div className="text-xs text-gray-300 mb-1">{message.sender}:</div>
                  <div className="text-sm leading-relaxed whitespace-pre-line">{message.content}</div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-white max-w-[85%] px-4 py-3 rounded-2xl border border-gray-700">
                  <div className="text-xs text-gray-300 mb-1">Ask the Stars:</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Consulting the cosmos</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-orange-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1 h-1 bg-red-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && !isKeyboardOpen && (
        <div className="bg-black/60 backdrop-blur-sm border-t border-gray-700/30 py-3 flex-shrink-0 relative z-40">
          <div className="overflow-x-auto">
            <div className="flex gap-3 px-4 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex-shrink-0 bg-gray-800/70 hover:bg-red-800/80 active:bg-red-700/80 text-gray-200 hover:text-white active:text-white px-4 py-3 rounded-xl border border-gray-600/50 hover:border-red-400/70 active:border-red-300/70 transition-all duration-200 touch-manipulation active:scale-95 text-sm font-medium whitespace-nowrap"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-gray-800 flex-shrink-0 relative z-50">
        <div className="px-4 py-3">
          <div className="max-w-lg mx-auto flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                }
              }}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-800 text-white rounded-full px-4 py-3 border border-gray-700 focus:border-red-500 focus:outline-none disabled:opacity-50 text-base touch-manipulation"
              disabled={isTyping}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              style={{ 
                fontSize: '16px',
                transform: 'translateZ(0)'
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50 hover:from-red-600 hover:to-orange-600 active:from-red-700 active:to-orange-700 transition-all duration-200 touch-manipulation active:scale-95 flex items-center justify-center min-w-[60px]"
            >
              {isTyping ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
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