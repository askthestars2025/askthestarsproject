import { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateChatResponse } from '../lib/gemini';

export default function ConversationalOnboarding({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    birthPlace: ''
  });
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  
  // Date picker state
  const [selectedDay, setSelectedDay] = useState('01');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedYear, setSelectedYear] = useState('1994');
  
  // Time picker state
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const messagesEndRef = useRef(null);

  const steps = [
    {
      question: "Welcome to Ask the Stars! ✨ I'm here to create your cosmic profile. Let's start with something simple - what's your first name?",
      field: 'name',
      type: 'text'
    },
    {
      question: "what a beautiful name! ✨\n\nNow, when were you born? I'll need your exact birth date to read your stars accurately.",
      field: 'dateOfBirth', 
      type: 'date'
    },
    {
      question: "Perfect! Now, do you know the exact time you were born? This helps me understand your rising sign and moon placement. 🌙",
      field: 'timeOfBirth',
      type: 'time'
    },
    {
      question: "Almost done! What city were you born in? I need this to calculate your precise astrological chart. 🌍",
      field: 'birthPlace',
      type: 'location'
    }
  ];

  // Popular cities for suggestions
  const popularCities = [
    "Mumbai, India", "Delhi, India", "Bangalore, India", "London, UK", "New York, USA",
    "Los Angeles, USA", "Tokyo, Japan", "Paris, France", "Berlin, Germany", "Sydney, Australia",
    "Toronto, Canada", "Dubai, UAE", "Singapore", "Rome, Italy", "Madrid, Spain",
    "Amsterdam, Netherlands", "Stockholm, Sweden", "Copenhagen, Denmark", "Oslo, Norway",
    "Zurich, Switzerland", "Vienna, Austria", "Prague, Czech Republic", "Warsaw, Poland",
    "Budapest, Hungary", "Athens, Greece", "Istanbul, Turkey", "Cairo, Egypt",
    "Cape Town, South Africa", "São Paulo, Brazil", "Mexico City, Mexico", "Buenos Aires, Argentina"
  ];

  useEffect(() => {
    // Add initial message with delay for natural feel
    setTimeout(() => {
      addMessage("Ask the Stars", steps[0].question, 'assistant');
    }, 500);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (sender, content, type = 'user') => {
    setMessages(prev => [...prev, { sender, content, type, timestamp: Date.now() }]);
  };

  const simulateTyping = async (response) => {
    setIsTyping(true);
    // Simulate realistic typing speed
    const typingDelay = Math.min(response.length * 30, 2000);
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    setIsTyping(false);
    addMessage("Ask the Stars", response, 'assistant');
  };

  const validateWithAI = async (field, value) => {
    try {
      const prompts = {
        name: `Is "${value}" a valid human name? Respond with just "VALID" or "SUGGEST: [corrected name]"`,
        birthPlace: `Is "${value}" a valid city/location name? If not, suggest the most likely correct spelling. Respond with just "VALID" or "SUGGEST: [corrected location]" - only provide the corrected city name, nothing else.`
      };

      if (!prompts[field]) return { valid: true, suggestion: null };

      const response = await generateChatResponse({
        category: 'ask-anything',
        userMessage: prompts[field],
        userData: formData,
        conversationHistory: []
      });

      if (response.includes('SUGGEST:')) {
        const suggestion = response.replace('SUGGEST:', '').trim();
        // Extract just the location name, remove any extra text
        const locationMatch = suggestion.match(/([A-Za-z\s,]+?)(?:\s|$|[🌟✨⭐🌠💫])/);
        const cleanLocation = locationMatch ? locationMatch[1].trim() : suggestion;
        
        return {
          valid: false,
          suggestion: cleanLocation
        };
      }

      return { valid: true, suggestion: null };
    } catch (error) {
      console.error('AI validation error:', error);
      return { valid: true, suggestion: null };
    }
  };

  const getAISuggestions = async (input) => {
    try {
      if (input.length < 2) return [];
      
      const response = await generateChatResponse({
        category: 'ask-anything',
        userMessage: `Suggest 5 cities that start with or sound like "${input}". Respond with just the city names separated by commas, in format: "City, Country". No extra text.`,
        userData: formData,
        conversationHistory: []
      });

      // Parse AI response and combine with popular cities
      const aiSuggestions = response.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
      
      // Also get popular cities that match
      const popularMatches = popularCities.filter(city => 
        city.toLowerCase().includes(input.toLowerCase())
      ).slice(0, 3);

      // Combine and deduplicate
      const allSuggestions = [...new Set([...aiSuggestions, ...popularMatches])];
      return allSuggestions.slice(0, 5);
    } catch (error) {
      console.error('AI suggestions error:', error);
      // Fallback to popular cities only
      return popularCities.filter(city => 
        city.toLowerCase().includes(input.toLowerCase())
      ).slice(0, 5);
    }
  };

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

  const handleLocationInput = async (value) => {
    setInputValue(value);
    
    if (value.length > 1) {
      // Show loading state
      setLocationSuggestions(['🔮 Finding cosmic locations...']);
      setShowLocationSuggestions(true);
      
      // Get AI-powered suggestions
      const suggestions = await getAISuggestions(value);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Handle different input types
    if (currentStep === 1 && !showDatePicker) {
      setShowDatePicker(true);
      return;
    }
    
    if (currentStep === 2 && !showTimePicker) {
      setShowTimePicker(true);
      return;
    }

    let value = inputValue.trim();
    
    // Get values from pickers
    if (currentStep === 1 && showDatePicker) {
      value = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    }
    
    if (currentStep === 2 && showTimePicker) {
      value = `${selectedHour}:${selectedMinute}`;
    }

    if (!value && steps[currentStep].field !== 'timeOfBirth') return;

    // Add user message
    addMessage("You", currentStep === 1 ? `${selectedDay}/${selectedMonth}/${selectedYear}` : value, 'user');
    setInputValue('');
    setShowLocationSuggestions(false);

    // Validate with AI for name and location
    if (currentStep === 0 || currentStep === 3) {
      const validation = await validateWithAI(steps[currentStep].field, value);
      
      if (!validation.valid && validation.suggestion) {
        await simulateTyping(`I think you might mean "${validation.suggestion}". Let me use that instead! ✨`);
        value = validation.suggestion;
      }
    }

    // Update form data
    const updatedFormData = {
      ...formData,
      [steps[currentStep].field]: value
    };
    setFormData(updatedFormData);

    if (currentStep < steps.length - 1) {
      // Move to next step
      const nextStep = currentStep + 1;
      let nextQuestion = steps[nextStep].question;
      
      // Personalize responses
      if (nextStep === 1 && updatedFormData.name) {
        nextQuestion = `${updatedFormData.name}, ${nextQuestion}`;
      }
      
      if (nextStep === 2 && updatedFormData.dateOfBirth) {
        const zodiac = getZodiacSign(updatedFormData.dateOfBirth);
        if (zodiac) {
          nextQuestion = `Ah, a ${zodiac}! How wonderful! ♨️\n\n${nextQuestion}`;
        }
      }
      
      setTimeout(() => {
        simulateTyping(nextQuestion);
      }, 500);
      
      setCurrentStep(nextStep);
      setShowDatePicker(false);
      setShowTimePicker(false);
    } else {
      // Complete onboarding
      const zodiac = getZodiacSign(updatedFormData.dateOfBirth);
      await simulateTyping(`Perfect! I now have everything I need to create your cosmic profile, ${updatedFormData.name}! ✨\n\nArchiving this chat and preparing your personalized experience...`);
      
      setTimeout(async () => {
        await saveProfile(updatedFormData);
        onComplete();
      }, 2500);
    }
  };

  const saveProfile = async (data) => {
    try {
      const dataToSave = {
        ...data,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), dataToSave);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    }
  };

  const confirmDate = () => {
    handleSubmit();
  };

  const confirmTime = () => {
    handleSubmit();
  };

  const skipTime = () => {
    setFormData({...formData, timeOfBirth: '12:00'});
    addMessage("You", "I don't know my exact birth time", 'user');
    
    setTimeout(() => {
      simulateTyping("No worries! I'll use noon as a default. Your sun sign is still perfectly accurate! ☀️\n\n" + steps[3].question);
    }, 500);
    
    setCurrentStep(3);
    setShowTimePicker(false);
  };

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
      <div className="border-b border-gray-800 p-3 sm:p-4 safe-area-top relative z-20">
        <div className="flex items-center justify-center max-w-lg mx-auto">
          <div className="flex items-center space-x-2">
            <div className="text-xl sm:text-2xl">✨</div>
            <h1 className="text-base sm:text-lg font-semibold">Get set up</h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 sm:p-4 pb-28 sm:pb-32 max-w-lg mx-auto relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
              <div className={`max-w-[85%] sm:max-w-[280px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl whitespace-pre-line ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' 
                  : 'bg-gray-800 text-white border border-gray-700'
              }`}>
                <div className="text-xs text-gray-300 mb-1">{message.sender}:</div>
                <div className="text-sm leading-relaxed">{message.content}</div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-gray-800 text-white max-w-[85%] sm:max-w-[280px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-gray-700">
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
        <div ref={messagesEndRef} className="h-2 sm:h-4" />
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl border border-red-500/40 rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Select your birth date</h3>
            
            <div className="flex justify-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
              {/* Day */}
              <div className="text-center flex-1">
                <label className="text-xs sm:text-sm text-gray-400 block mb-2">Day</label>
                <select 
                  value={selectedDay} 
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 sm:px-3 py-2 text-lg sm:text-xl font-mono border border-gray-700 focus:border-red-500 touch-manipulation"
                >
                  {Array.from({length: 31}, (_, i) => {
                    const day = String(i + 1).padStart(2, '0');
                    return <option key={day} value={day}>{day}</option>;
                  })}
                </select>
              </div>

              {/* Month */}
              <div className="text-center flex-1">
                <label className="text-xs sm:text-sm text-gray-400 block mb-2">Month</label>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 sm:px-3 py-2 text-lg sm:text-xl font-mono border border-gray-700 focus:border-red-500 touch-manipulation"
                >
                  {[
                    '01', '02', '03', '04', '05', '06',
                    '07', '08', '09', '10', '11', '12'
                  ].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="text-center flex-1">
                <label className="text-xs sm:text-sm text-gray-400 block mb-2">Year</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 sm:px-3 py-2 text-lg sm:text-xl font-mono border border-gray-700 focus:border-red-500 touch-manipulation"
                >
                  {Array.from({length: 80}, (_, i) => {
                    const year = String(2010 - i);
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>

            <button
              onClick={confirmDate}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 active:from-red-700 active:to-orange-700 text-white font-semibold py-3 sm:py-4 rounded-full transition-all duration-200 touch-manipulation active:scale-95"
            >
              Confirm Date ✨
            </button>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 backdrop-blur-xl border border-red-500/40 rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Select your birth time</h3>
            
            <div className="flex justify-center space-x-6 sm:space-x-8 mb-6 sm:mb-8">
              {/* Hour */}
              <div className="text-center flex-1">
                <label className="text-xs sm:text-sm text-gray-400 block mb-2">Hour</label>
                <select 
                  value={selectedHour} 
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 sm:px-3 py-2 text-xl sm:text-2xl font-mono border border-gray-700 focus:border-red-500 touch-manipulation"
                >
                  {Array.from({length: 24}, (_, i) => {
                    const hour = String(i).padStart(2, '0');
                    return <option key={hour} value={hour}>{hour}</option>;
                  })}
                </select>
              </div>

              {/* Minute */}
              <div className="text-center flex-1">
                <label className="text-xs sm:text-sm text-gray-400 block mb-2">Minute</label>
                <select 
                  value={selectedMinute} 
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 sm:px-3 py-2 text-xl sm:text-2xl font-mono border border-gray-700 focus:border-red-500 touch-manipulation"
                >
                  {Array.from({length: 60}, (_, i) => {
                    const minute = String(i).padStart(2, '0');
                    return <option key={minute} value={minute}>{minute}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={confirmTime}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 active:from-red-700 active:to-orange-700 text-white font-semibold py-3 sm:py-4 rounded-full transition-all duration-200 touch-manipulation active:scale-95"
              >
                Confirm Time 🌙
              </button>
              <button
                onClick={skipTime}
                className="w-full text-gray-400 font-medium py-2 sm:py-3 hover:text-white active:text-gray-300 transition-colors touch-manipulation"
              >
                I don't know my exact birth time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Suggestions */}
      {showLocationSuggestions && (
        <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 sm:left-4 sm:right-4 z-50">
          <div className="max-w-lg mx-auto bg-gray-800/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl">
            <div className="p-2.5 sm:p-3 border-b border-gray-700">
              <div className="text-xs text-gray-400 text-center">🌍 Suggested locations:</div>
            </div>
            <div className="max-h-40 sm:max-h-48 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {locationSuggestions.map((location, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!location.includes('🔮')) {
                      setInputValue(location);
                      setShowLocationSuggestions(false);
                    }
                  }}
                  disabled={location.includes('🔮')}
                  className={`w-full text-left px-3 sm:px-4 py-3 transition-all duration-200 border-b border-gray-700 last:border-b-0 touch-manipulation ${
                    location.includes('🔮') 
                      ? 'text-red-400 cursor-wait animate-pulse' 
                      : 'hover:bg-gray-700 active:bg-gray-600 text-white cursor-pointer active:scale-[0.98] hover:text-orange-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 text-sm">
                      {location.includes('🔮') ? '🔮' : '📍'}
                    </span>
                    <span className="text-sm">{location}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!showDatePicker && !showTimePicker && currentStep < steps.length && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 safe-area-bottom z-30">
          <div className="p-3 sm:p-4 pb-safe">
            <div className="max-w-lg mx-auto">
              <div className="flex space-x-2 sm:space-x-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => currentStep === 3 ? handleLocationInput(e.target.value) : setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                  onClick={() => {
                    if (currentStep === 1) {
                      setShowDatePicker(true);
                    } else if (currentStep === 2) {
                      setShowTimePicker(true);
                    }
                  }}
                  placeholder={
                    currentStep === 0 ? 'Type your name...' :
                    currentStep === 1 ? 'Tap here to select date' :
                    currentStep === 2 ? 'Tap here to select time' :
                    'Start typing your city...'
                  }
                  className="flex-1 bg-gray-800 text-white rounded-full px-4 py-3 sm:py-3.5 border border-gray-700 focus:border-red-500 focus:outline-none touch-manipulation text-sm sm:text-base"
                  autoFocus={currentStep === 0 || currentStep === 3}
                  required={currentStep !== 2}
                  readOnly={currentStep === 1 || currentStep === 2}
                  autoComplete="off"
                  autoCapitalize={currentStep === 0 || currentStep === 3 ? "words" : "off"}
                  autoCorrect={currentStep === 0 || currentStep === 3 ? "on" : "off"}
                  spellCheck={currentStep === 0 || currentStep === 3}
                />
                <button
                  onClick={handleSubmit}
                  disabled={(!inputValue.trim() && currentStep !== 1 && currentStep !== 2) || isTyping}
                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 sm:px-6 py-3 sm:py-3.5 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-600 hover:to-orange-600 active:from-red-700 active:to-orange-700 transition-all duration-200 touch-manipulation active:scale-95 min-w-[52px] flex items-center justify-center"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </button>
              </div>
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
