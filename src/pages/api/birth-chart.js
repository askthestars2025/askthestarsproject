// pages/api/birth-chart.js
import swisseph from 'swisseph';

// Note: No ephemeris path needed for Moshier calculations (which work great on Vercel)

// Define planet IDs at the top level
const planetIds = {
  sun: swisseph.SE_SUN,
  moon: swisseph.SE_MOON,
  mercury: swisseph.SE_MERCURY,
  venus: swisseph.SE_VENUS,
  mars: swisseph.SE_MARS,
  jupiter: swisseph.SE_JUPITER,
  saturn: swisseph.SE_SATURN,
  uranus: swisseph.SE_URANUS,
  neptune: swisseph.SE_NEPTUNE,
  pluto: swisseph.SE_PLUTO
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dateOfBirth, timeOfBirth, birthPlace, currentTransits } = req.body;

    // Handle two types of requests: birth chart OR current transits
    if (currentTransits) {
      // Calculate current planetary positions for today
      const now = new Date();
      const currentJulianDay = swisseph.swe_julday(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + (now.getMinutes() / 60),
        swisseph.SE_GREG_CAL
      );

      const currentPlanets = {};
      for (const [planetName, planetId] of Object.entries(planetIds)) {
        try {
          const flags = [swisseph.SEFLG_SWIEPH, swisseph.SEFLG_JPLEPH, swisseph.SEFLG_MOSEPH];
          
          let result = null;
          for (const flag of flags) {
            try {
              result = swisseph.swe_calc_ut(currentJulianDay, planetId, flag);
              if (result && typeof result === 'object') break;
            } catch (flagError) {
              continue;
            }
          }
          
          if (result && typeof result === 'object') {
            let longitude = result.longitude || (result.xx && result.xx[0]);
            let speed = result.longitude_speed || (result.xx && result.xx[3]) || 0;
            
            if (longitude !== null && !isNaN(longitude)) {
              currentPlanets[planetName] = {
                degree: longitude,
                sign: getZodiacSign(longitude),
                retrograde: speed < 0
              };
            } else {
              currentPlanets[planetName] = null;
            }
          } else {
            currentPlanets[planetName] = null;
          }
        } catch (planetError) {
          console.error(`Error calculating current ${planetName}:`, planetError);
          currentPlanets[planetName] = null;
        }
      }

      // Return current planetary positions
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        currentDate: now.toISOString().split('T')[0],
        julianDay: currentJulianDay,
        planets: currentPlanets,
        calculatedBy: 'Swiss Ephemeris',
        type: 'current_transits'
      });
    }

    // Original birth chart calculation
    if (!dateOfBirth || !timeOfBirth || !birthPlace) {
      return res.status(400).json({ error: 'Missing required birth data' });
    }

    // Parse birth date and time
    const birthDate = new Date(`${dateOfBirth}T${timeOfBirth}:00`);
    
    // Convert to Julian Day Number (required by Swiss Ephemeris)
    const julianDay = swisseph.swe_julday(
      birthDate.getFullYear(),
      birthDate.getMonth() + 1,
      birthDate.getDate(),
      birthDate.getHours() + (birthDate.getMinutes() / 60),
      swisseph.SE_GREG_CAL
    );

    // Get coordinates for birth place (simplified - you might want to use a geocoding API)
    const coordinates = await getCoordinates(birthPlace);
    
    // Calculate planetary positions
    const planets = {};

    // Calculate each planet's position
    for (const [planetName, planetId] of Object.entries(planetIds)) {
      try {
        // Try different ephemeris flags in order of preference
        const flags = [swisseph.SEFLG_SWIEPH, swisseph.SEFLG_JPLEPH, swisseph.SEFLG_MOSEPH];
        
        let result = null;
        for (const flag of flags) {
          try {
            result = swisseph.swe_calc_ut(julianDay, planetId, flag);
            if (result && typeof result === 'object') break;
          } catch (flagError) {
            continue; // Try next flag
          }
        }
        
        if (result && typeof result === 'object') {
          // Extract longitude and speed
          let longitude = result.longitude || (result.xx && result.xx[0]);
          let speed = result.longitude_speed || (result.xx && result.xx[3]) || 0;
          
          if (longitude !== null && !isNaN(longitude)) {
            planets[planetName] = {
              degree: longitude,
              sign: getZodiacSign(longitude),
              retrograde: speed < 0
            };
          } else {
            planets[planetName] = null;
          }
        } else {
          planets[planetName] = null;
        }
      } catch (planetError) {
        console.error(`Error calculating ${planetName}:`, planetError);
        planets[planetName] = null;
      }
    }

    // Calculate Ascendant (Rising Sign)
    let ascendant = null;
    try {
      const houses = swisseph.swe_houses(
        julianDay,
        coordinates.latitude,
        coordinates.longitude,
        'P' // Placidus house system
      );
      
      if (houses.ascendant) {
        ascendant = {
          degree: houses.ascendant,
          sign: getZodiacSign(houses.ascendant)
        };
      }
    } catch (ascError) {
      console.error('Error calculating ascendant:', ascError);
    }

    // Return birth chart data
    const birthChart = {
      timestamp: new Date().toISOString(),
      birthData: {
        date: dateOfBirth,
        time: timeOfBirth,
        place: birthPlace,
        coordinates
      },
      julianDay,
      planets,
      ascendant,
      calculatedBy: 'Swiss Ephemeris'
    };

    res.status(200).json(birthChart);

  } catch (error) {
    console.error('Birth chart calculation error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate birth chart',
      details: error.message 
    });
  }
}

// Helper function to convert longitude to zodiac sign
function getZodiacSign(longitude) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const signIndex = Math.floor(longitude / 30);
  return signs[signIndex] || 'Unknown';
}

// Enhanced geocoding function using free API
async function getCoordinates(place) {
  try {
    // Try using a free geocoding API first
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
      {
        headers: {
          'User-Agent': 'AskTheStars-App/1.0'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
    }
  } catch (error) {
    console.warn('Geocoding API failed, using fallback:', error);
  }

  // Fallback to hardcoded coordinates
  const cityCoords = {
    'mumbai, india': { latitude: 19.0760, longitude: 72.8777 },
    'delhi, india': { latitude: 28.7041, longitude: 77.1025 },
    'bangalore, india': { latitude: 12.9716, longitude: 77.5946 },
    'kanpur, india': { latitude: 26.4499, longitude: 80.3319 },
    'london, uk': { latitude: 51.5074, longitude: -0.1278 },
    'new york, usa': { latitude: 40.7128, longitude: -74.0060 },
    'los angeles, usa': { latitude: 34.0522, longitude: -118.2437 },
    'tokyo, japan': { latitude: 35.6762, longitude: 139.6503 },
    'paris, france': { latitude: 48.8566, longitude: 2.3522 }
  };

  const key = place.toLowerCase();
  if (cityCoords[key]) {
    return cityCoords[key];
  }

  // Default to Greenwich if location not found
  console.warn(`Coordinates not found for ${place}, using Greenwich as default`);
  return { latitude: 51.4778, longitude: -0.0015 };
}