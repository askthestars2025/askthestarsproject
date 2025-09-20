// Enhanced lib/gemini.js with Swiss Ephemeris Integration + Current Date + Production URLs
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyCyB-UP1k3jtiIxoTWSToeXc8ejvLDq2vo';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// FLUX API Configuration
const FLUX_API_KEY = process.env.NEXT_PUBLIC_FLUX_API_KEY;
const FLUX_API_URL = 'https://fal.run/fal-ai/flux-pro/kontext/text-to-image';

// Helper to get the correct base URL for API calls
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

// NEW: Get current planetary positions
async function getCurrentTransits() {
  try {
    const response = await fetch(`${getBaseUrl()}/api/birth-chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentTransits: true
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get current transits:', error);
  }
  return null;
}

// NEW: Swiss Ephemeris Integration Functions
async function getBirthChartData(userData) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/birth-chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateOfBirth: userData.dateOfBirth,
        timeOfBirth: userData.timeOfBirth,
        birthPlace: userData.birthPlace
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get birth chart:', error);
  }
  return null;
}

function formatChartForAI(chart) {
  if (!chart || !chart.planets) return '';
  
  const planetData = Object.entries(chart.planets)
    .filter(([_, data]) => data !== null)
    .map(([planet, data]) => 
      `${planet.toUpperCase()}: ${data.sign} ${data.degree.toFixed(1)}° ${data.retrograde ? '(Retrograde)' : ''}`
    )
    .join('\n');

  const ascendant = chart.ascendant ? 
    `ASCENDANT: ${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(1)}°` : '';

  return `BIRTH CHART:\n${planetData}\n${ascendant}`;
}

function formatCurrentTransitsForAI(transits) {
  if (!transits || !transits.planets) return '';
  
  const planetData = Object.entries(transits.planets)
    .filter(([_, data]) => data !== null)
    .map(([planet, data]) => 
      `${planet.toUpperCase()}: ${data.sign} ${data.degree.toFixed(1)}° ${data.retrograde ? '(Retrograde)' : ''}`
    )
    .join('\n');

  return `CURRENT PLANETARY POSITIONS (${transits.currentDate}):\n${planetData}`;
}

// Helper function to get current date and time info
function getCurrentDateInfo() {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  return {
    fullDate: now.toISOString().split('T')[0], // YYYY-MM-DD
    dayName: days[now.getDay()],
    monthName: months[now.getMonth()],
    dayOfMonth: now.getDate(),
    year: now.getFullYear(),
    formattedDate: `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
  };
}

// Helper function to get zodiac sign (fallback for when Swiss Ephemeris isn't available)
function getZodiacSign(dateString) {
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
}

// Helper to vary name usage naturally
function getNameVariation(name, messageCount, isFollowUp = false) {
  if (!name || messageCount === undefined) return null;
  
  const shouldUseName = messageCount === 0 || 
    (messageCount % 4 === 0 && Math.random() > 0.3) || 
    (isFollowUp && Math.random() > 0.7);
    
  if (!shouldUseName) return null;
  return name;
}

function getConversationDepth(conversationHistory) {
  return conversationHistory ? conversationHistory.length : 0;
}

export async function generateChatResponse({ category, userMessage, userData, conversationHistory }) {
  try {
    // Get current date information
    const currentDate = getCurrentDateInfo();
    
    // NEW: Get real birth chart data AND current transits for astrological categories
    let astrologyData = '';
    let currentTransitData = '';
    
    if (['daily-horoscope', 'romantic-compatibility', 'astrological-events'].includes(category)) {
      // Get birth chart
      const chart = await getBirthChartData(userData);
      if (chart) {
        astrologyData = formatChartForAI(chart);
      }
      
      // Get current planetary positions
      const transits = await getCurrentTransits();
      if (transits) {
        currentTransitData = formatCurrentTransitsForAI(transits);
      }
    }

    const conversationDepth = getConversationDepth(conversationHistory);
    const nameToUse = getNameVariation(userData?.name, conversationDepth);
    
    // Enhanced category-specific prompts with real astrological data + current date
    const categoryPrompts = {
      'ask-anything': `You are Lunatica, a direct cosmic advisor who provides clear, practical guidance. Your responses are precise, informative, and objective while maintaining authenticity.

CURRENT DATE & TIME: ${currentDate.formattedDate}

CONVERSATION STYLE:
- Provide clear, direct answers without unnecessary emotional language
- Use straightforward sentence structure that conveys information efficiently
- Reference conversation context when relevant to the answer
- Avoid formulaic openings or flowery language
- Be factual and specific in your guidance
- Focus on actionable insights rather than abstract concepts
- Include current date context when relevant to timing questions

RESPONSE GUIDELINES:  
- Keep responses under 100 words, focusing on useful information
- Use ${nameToUse ? `"${nameToUse}"` : 'direct address'} only when contextually necessary
- Include birth chart insights when they directly relate to the question
- Build on previous conversation points that are relevant to current query
- Start responses with the most important information first
- Provide honest assessment without sugar-coating`,

      'daily-horoscope': `You are Lunatica, an astrologer providing daily guidance based on EXACT current planetary positions from Swiss Ephemeris calculations.

TODAY'S DATE: ${currentDate.formattedDate}

${astrologyData ? astrologyData + '\n' : ''}
${currentTransitData ? currentTransitData + '\n' : ''}

CRITICAL INSTRUCTIONS - USE ONLY THE EXACT DATA ABOVE:
- You MUST use the precise planetary positions and degrees listed above
- Compare TODAY'S transits to the natal chart positions using the EXACT degrees shown
- Reference the specific degree measurements (e.g., "Moon at 167.4° Virgo")
- Calculate actual aspects between current and natal positions using the degrees provided
- DO NOT make up planetary positions - use ONLY the data above

RESPONSE FORMAT:
Start with: "Today's [current planet at exact degree] [aspect] your natal [planet at exact degree]..."
Then provide practical guidance based on this real astronomical data.

Keep under 100 words using ONLY the precise positions listed above.`,

      'romantic-compatibility': `You are Lunatica, a relationship analyst who uses astrological factors to assess compatibility patterns. Provide direct, honest assessments based on astrological principles.

CURRENT DATE: ${currentDate.formattedDate}

${astrologyData ? astrologyData + '\n' : ''}
${currentTransitData ? currentTransitData + '\n' : ''}

DIRECT COMPATIBILITY ANALYSIS:
- State compatibility factors clearly and objectively using real chart data
- Address how current planetary movements affect relationships
- Reference current Venus/Mars positions when relevant
- Provide practical relationship advice for this time period
- Be honest about challenges and strengths
- Focus on actionable insights for NOW

Under 100 words with clear, practical guidance.`,

      'friend-compatibility': `You are Lunatica, who analyzes social dynamics through astrological patterns. Provide straightforward insights about friendship compatibility and social interactions.

CURRENT DATE: ${currentDate.formattedDate}

DIRECT FRIENDSHIP ANALYSIS:
- Explain social compatibility factors clearly
- Address specific social dynamics based on astrological patterns
- Consider current planetary influences on social connections
- Provide practical advice for improving social connections RIGHT NOW
- Reference ${nameToUse ? `${nameToUse}'s` : 'their'} social tendencies when directly relevant
- Be honest about potential friction points and natural affinities

Keep under 100 words with clear, actionable advice.`,

      'dream-interpreter': `You are Lunatica, who interprets dreams using established symbolic meanings and psychological principles. Provide clear, specific interpretations without excessive mysticism.

CURRENT DATE: ${currentDate.formattedDate}

DIRECT DREAM ANALYSIS:
- Explain dream symbols using recognized interpretive frameworks
- Connect dream content to relevant life situations directly
- Consider current planetary influences that might affect dreams
- Provide practical insights about subconscious processing
- Reference ${nameToUse ? `${nameToUse}'s` : 'their'} current circumstances when relevant to interpretation
- Focus on actionable understanding rather than abstract meanings

Under 100 words with specific, useful interpretations.`,

      'astrological-events': `You are Lunatica, who tracks current astrological transits and their practical effects. Provide specific information about how celestial events impact individual charts.

TODAY'S DATE: ${currentDate.formattedDate}

${astrologyData ? astrologyData + '\n' : ''}
${currentTransitData ? currentTransitData + '\n' : ''}

DIRECT ASTROLOGICAL ANALYSIS:
- State what planetary events are happening TODAY and this week
- Explain how current transits interact with ${nameToUse ? `${nameToUse}'s` : 'their'} personal chart
- Provide practical timing guidance for decisions and actions
- Reference specific current planetary aspects and movements
- Focus on actionable timing and practical applications for RIGHT NOW

Under 100 words with precise, current astronomical information.`,

      'tarot-interpreter': `You are Lunatica, who interprets tarot cards using established meanings and practical applications. Provide clear, direct card interpretations focused on actionable guidance.

CURRENT DATE: ${currentDate.formattedDate}

DIRECT TAROT ANALYSIS:
- State card meanings clearly using recognized interpretations
- Connect symbolism to practical life applications directly
- Consider current cosmic energy (${currentDate.formattedDate}) in interpretation
- Provide specific guidance based on card combinations and positions
- Reference ${nameToUse ? `${nameToUse}'s` : 'their'} situation when directly relevant to the reading
- Focus on actionable insights rather than abstract symbolism

Under 100 words with clear, practical guidance.`
    };

    // Get the user's zodiac sign for personalization
    const zodiacSign = userData?.dateOfBirth ? getZodiacSign(userData.dateOfBirth) : '';
    
    // Build conversation context more naturally
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-4);
      conversationContext = '\n\nCONVERSATION FLOW:\n' + 
        recentMessages.map((msg, index) => {
          const isRecent = index >= recentMessages.length - 2;
          return `${isRecent ? '[RECENT] ' : ''}${msg.role}: "${msg.content}"`;
        }).join('\n');
    }

    // Create more natural user profile context
    const profileContext = `
USER ESSENCE:
${userData?.name ? `- Known as: ${userData.name}` : '- Identity: Anonymous seeker'}
${userData?.dateOfBirth ? `- Born: ${userData.dateOfBirth} (${zodiacSign || 'Unknown sign'})` : ''}
${userData?.timeOfBirth ? `- Birth time: ${userData.timeOfBirth}` : ''}
${userData?.birthPlace ? `- Birth place: ${userData.birthPlace}` : ''}
`;

    // Enhanced instructions for natural responses
    const naturalInstructions = `
CRITICAL - DATA VALIDATION REQUIREMENTS:
- You are responding on ${currentDate.formattedDate} - use this current date for all timing references
- If astrological data is provided above, you MUST use the exact planetary positions and degrees shown
- DO NOT generate any planetary positions that are not explicitly listed in the data above
- When referencing planets, always include the exact degree (e.g., "Moon at 167.4° Virgo")
- If no real astronomical data is provided, state this clearly rather than making up positions
${astrologyData ? '- MANDATORY: Use the exact birth chart positions shown above with degrees' : ''}
${currentTransitData ? '- MANDATORY: Use the exact current transit positions shown above with degrees' : ''}

DIRECT ENGAGEMENT PATTERNS:
- Reference their name (${nameToUse || 'NO NAME - use direct address'}) only when contextually necessary
- Address their specific question directly without tangential information
- Use clear, straightforward sentence structures
- Be honest about limitations or uncertainties
- Focus on actionable information rather than abstract concepts
- Always verify planetary positions match the data provided above

AVOID COMPLETELY:
- Making up planetary positions not listed in the provided data
- Generic astrological statements without specific degrees
- Outdated date references - TODAY IS ${currentDate.formattedDate}
- Any planetary positions that contradict the Swiss Ephemeris data above

Focus: Give precise, useful information using ONLY the real astronomical data provided above.`;

    // Create the main prompt
    const prompt = `${categoryPrompts[category] || categoryPrompts['ask-anything']}

${profileContext}
${conversationContext}

CURRENT MESSAGE: "${userMessage}"

${naturalInstructions}

Respond as Lunatica with authentic, varied conversation:`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topK: 50,
          topP: 0.95,
          maxOutputTokens: 180,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.candidates[0].content.parts[0].text;
    
    // Post-process to ensure natural flow
    aiResponse = aiResponse
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\n\n+/g, '\n')
      .trim();

    return aiResponse;
    
  } catch (error) {
    console.error('Error calling Gemini API for chat:', error);
    throw new Error('Failed to generate AI response. Please try again.');
  }
}

export async function generateSoulmateAnalysis(userData) {
  try {
    // NEW: Get real birth chart data
    const chart = await getBirthChartData(userData);
    let astrologyContext = '';
    
    if (chart && chart.planets) {
      const venus = chart.planets.venus;
      const mars = chart.planets.mars;
      const sun = chart.planets.sun;
      const moon = chart.planets.moon;
      
      astrologyContext = `
REAL ASTROLOGICAL DATA FOR COMPATIBILITY:
${venus ? `Love Style (Venus): ${venus.sign} at ${venus.degree.toFixed(1)}° ${venus.retrograde ? '(Retrograde)' : ''}` : ''}
${mars ? `Attraction Style (Mars): ${mars.sign} at ${mars.degree.toFixed(1)}° ${mars.retrograde ? '(Retrograde)' : ''}` : ''}
${sun ? `Core Identity (Sun): ${sun.sign} at ${sun.degree.toFixed(1)}°` : ''}
${moon ? `Emotional Nature (Moon): ${moon.sign} at ${moon.degree.toFixed(1)}°` : ''}
${chart.ascendant ? `Rising Sign: ${chart.ascendant.sign} at ${chart.ascendant.degree.toFixed(1)}°` : ''}

Based on these REAL planetary positions, create the ideal complementary partner profile:`;
    }

    const { name, gender, dateOfBirth, timeOfBirth, birthPlace } = userData;
    
    const prompt = `
Create a concise, mystical soulmate reading for ${name}. Use the birth details below to provide specific insights. Format the response EXACTLY as shown with clear sections and bullet points for easy display:

${astrologyContext || 'Using traditional astrological principles for compatibility analysis.'}

Birth Details:
- Name: ${name}
- Gender: ${gender}
- Date of Birth: ${dateOfBirth}
- Time of Birth: ${timeOfBirth}
- Birth Place: ${birthPlace}

Format your response EXACTLY like this:

APPEARANCE
Height: Medium to tall with an elegant presence
Build: Well-proportioned and naturally graceful
Face: Strong jawline with expressive, kind eyes
Hair: Dark brown or black, well-maintained style
Style: Classic and sophisticated, attention to detail

PERSONALITY
Core Traits: Loyal, intelligent, ambitious, independent
Strengths: Strong integrity, excellent communication, supportive nature
Communication: Direct and honest, values transparency
Emotional Nature: Stable and balanced, mature emotional handling

COMPATIBILITY
Shared Values: Loyalty, honesty, commitment to growth
Mutual Interests: Learning, culture, travel, building secure future
Complement: Your creativity balanced by their practicality
Connection Score: 94% - Extraordinary cosmic alignment

TIMELINE
Meeting Period: Within next 8-14 months, likely spring/summer
Meeting Place: Educational or cultural setting (bookstore, gallery, workshop)
Relationship Development: Starts as friendship, builds gradually on trust
Key Milestone: Deep commitment within 2-3 years

RECOGNITION SIGNS
Instant Connection: Deep understanding and easy communication
Shared Vision: Similar life goals and values alignment
Peaceful Presence: Feel calm and inspired in their company
Intellectual Bond: Stimulating conversations and mutual respect
Intuitive Knowing: Your heart will recognize them immediately

Keep each section concise and mystical. Use the real astrological data provided above when available.
    `;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1500,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to generate soulmate analysis. Please try again.');
  }
}

export async function generateSoulmateImagePrompt(userData) {
  try {
    // NEW: Get birth chart for enhanced image generation
    const chart = await getBirthChartData(userData);
    let astrologyContext = '';
    
    if (chart && chart.planets) {
      const venus = chart.planets.venus;
      const mars = chart.planets.mars;
      const ascendant = chart.ascendant;
      
      astrologyContext = `
ASTROLOGICAL APPEARANCE FACTORS:
${venus ? `- Venus in ${venus.sign}: Influences attraction to ${getVenusAppearanceTraits(venus.sign)}` : ''}
${mars ? `- Mars in ${mars.sign}: Drawn to ${getMarsAppearanceTraits(mars.sign)}` : ''}
${ascendant ? `- Ascendant in ${ascendant.sign}: Compatible with ${getAscendantCompatibility(ascendant.sign)}` : ''}
- Regional features from ${userData.birthPlace}`;
    }

    const { name, gender, dateOfBirth, timeOfBirth, birthPlace } = userData;
    
    // Extract country/region from birth place
    const getRegionalFeatures = (birthPlace) => {
      const place = birthPlace.toLowerCase();
      if (place.includes('india') || place.includes('indian')) {
        return 'South Asian features, warm brown or dark eyes, naturally tanned complexion';
      } else if (place.includes('china') || place.includes('chinese') || place.includes('taiwan') || place.includes('hong kong')) {
        return 'East Asian features, dark eyes, fair to medium complexion';
      } else if (place.includes('japan') || place.includes('japanese')) {
        return 'Japanese features, dark eyes, fair complexion';
      } else if (place.includes('korea') || place.includes('korean')) {
        return 'Korean features, dark eyes, fair complexion';
      } else if (place.includes('africa') || place.includes('nigeria') || place.includes('kenya') || place.includes('ghana')) {
        return 'African features, dark brown eyes, rich dark complexion';
      } else if (place.includes('middle east') || place.includes('iran') || place.includes('iraq') || place.includes('turkey')) {
        return 'Middle Eastern features, dark eyes, olive to medium complexion';
      } else if (place.includes('mexico') || place.includes('spain') || place.includes('latin') || place.includes('hispanic')) {
        return 'Latino/Hispanic features, brown eyes, olive to medium complexion';
      } else if (place.includes('russia') || place.includes('eastern europe') || place.includes('poland') || place.includes('ukraine')) {
        return 'Eastern European features, light to medium eyes, fair complexion';
      } else if (place.includes('scandinavia') || place.includes('norway') || place.includes('sweden') || place.includes('denmark')) {
        return 'Scandinavian features, light eyes, fair complexion';
      } else {
        return 'Mixed heritage features, expressive eyes, medium complexion';
      }
    };

    const prompt = `
Based on these birth details, create a realistic portrait description for ${name}'s astrologically compatible soulmate:

${astrologyContext || 'Using traditional astrological compatibility principles.'}

Birth Details:
- Name: ${name}
- Date of Birth: ${dateOfBirth}
- Time of Birth: ${timeOfBirth}
- Birth Place: ${birthPlace}

Create a description for a natural, realistic pencil sketch portrait considering:

Regional Features: ${getRegionalFeatures(birthPlace)}
${chart ? 'Astrological Compatibility: Features that complement the planetary placements above' : 'Astrological Compatibility: Someone whose appearance reflects complementary cosmic energies'}
Realistic Appearance: Natural, everyday beauty - not model-like or overly perfect
Age Range: Compatible life stage (late 20s to mid 30s)

Focus on:
- Authentic, natural facial features typical of the region
- Kind, intelligent expression showing depth of character
- Realistic proportions and natural beauty
- Features that suggest compatibility and harmony
- ${chart ? 'Subtle astrological influences from the planetary placements above' : 'Subtle astrological influences in their overall presence'}

Format as: "Realistic pencil sketch portrait of a person with [regional features], natural [specific facial details], authentic everyday appearance, kind intelligent expression, [age], drawn in realistic graphite style with natural shading and proportions..."

Keep the description grounded in reality - this should look like a real person you might meet, not an idealized fantasy.
    `;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.6,
          topK: 1,
          topP: 1,
          maxOutputTokens: 400,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating image prompt:', error);
    throw new Error('Failed to generate image prompt. Please try again.');
  }
}

// Helper functions for astrological appearance traits
function getVenusAppearanceTraits(sign) {
  const traits = {
    'Aries': 'bold, confident features and athletic build',
    'Taurus': 'classic beauty, strong jawline, earthy appeal',
    'Gemini': 'expressive eyes, youthful appearance, animated features',
    'Cancer': 'soft, nurturing features, rounded face, caring expression',
    'Leo': 'dramatic beauty, confident posture, radiant presence',
    'Virgo': 'refined features, neat appearance, subtle elegance',
    'Libra': 'harmonious features, natural grace, balanced proportions',
    'Scorpio': 'intense eyes, magnetic presence, mysterious appeal',
    'Sagittarius': 'adventurous spirit, athletic build, optimistic expression',
    'Capricorn': 'structured features, professional appearance, timeless style',
    'Aquarius': 'unique features, unconventional beauty, intelligent eyes',
    'Pisces': 'dreamy eyes, soft features, artistic appearance'
  };
  return traits[sign] || 'harmonious and balanced features';
}

function getMarsAppearanceTraits(sign) {
  const traits = {
    'Aries': 'strong, athletic physique and dynamic energy',
    'Taurus': 'solid build, physical presence, earthy sensuality',
    'Gemini': 'quick movements, expressive hands, lively demeanor',
    'Cancer': 'protective stance, emotional depth, nurturing energy',
    'Leo': 'confident posture, dramatic flair, commanding presence',
    'Virgo': 'precise movements, attention to detail, refined energy',
    'Libra': 'graceful movement, charming demeanor, balanced energy',
    'Scorpio': 'intense gaze, powerful presence, magnetic energy',
    'Sagittarius': 'adventurous spirit, free movement, optimistic energy',
    'Capricorn': 'structured approach, reliable presence, grounded energy',
    'Aquarius': 'unique style, independent spirit, innovative energy',
    'Pisces': 'fluid movement, intuitive presence, gentle energy'
  };
  return traits[sign] || 'balanced and harmonious energy';
}

function getAscendantCompatibility(sign) {
  const compatibility = {
    'Aries': 'confident, direct personalities',
    'Taurus': 'steady, reliable, grounded individuals',
    'Gemini': 'intellectually curious, communicative types',
    'Cancer': 'nurturing, emotionally intelligent people',
    'Leo': 'creative, generous, warm-hearted individuals',
    'Virgo': 'practical, helpful, detail-oriented people',
    'Libra': 'harmonious, diplomatic, relationship-focused individuals',
    'Scorpio': 'deep, transformative, intense personalities',
    'Sagittarius': 'adventurous, philosophical, freedom-loving types',
    'Capricorn': 'ambitious, responsible, structured individuals',
    'Aquarius': 'innovative, humanitarian, independent people',
    'Pisces': 'intuitive, compassionate, spiritual individuals'
  };
  return compatibility[sign] || 'balanced and compatible personalities';
}

export async function generateSoulmateImage(imagePrompt) {
  try {
    if (!FLUX_API_KEY) {
      throw new Error('FLUX API key not configured. Please add NEXT_PUBLIC_FLUX_API_KEY to your environment variables.');
    }

    // Enhance the prompt for realistic pencil sketch style
    const enhancedPrompt = `${imagePrompt}, natural realistic pencil sketch, authentic graphite drawing, realistic proportions, everyday natural beauty, genuine expression, detailed shading, portrait drawing style, not glamorous or model-like, authentic human features, realistic art style, natural lighting, honest portrayal`;

    const response = await fetch(FLUX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FLUX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        guidance_scale: 2.5,
        num_images: 1,
        output_format: "jpeg",
        safety_tolerance: "2",
        aspect_ratio: "3:4",
        sync_mode: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FLUX API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      imageUrl: data.images[0].url,
      prompt: data.prompt,
      seed: data.seed
    };
  } catch (error) {
    console.error('Error calling FLUX API:', error);
    throw new Error('Failed to generate soulmate image. Please try again.');
  }
}