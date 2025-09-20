// pages/api/test-swiss-ephemeris.js - FIXED VERSION
import { generateChatResponse } from '../../lib/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, userMessage, userData } = req.body;

    console.log('🧪 Testing Swiss Ephemeris Integration');
    console.log('📋 Input data:', { category, userData });

    // Test the exact same flow as the real chat interface
    const response = await generateChatResponse({
      category,
      userMessage,
      userData,
      conversationHistory: []
    });

    // Also fetch the data separately for debugging
    const [birthChart, currentTransits] = await Promise.all([
      fetch('http://localhost:3000/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: userData.dateOfBirth,
          timeOfBirth: userData.timeOfBirth,
          birthPlace: userData.birthPlace
        })
      }).then(r => r.json()),
      
      fetch('http://localhost:3000/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTransits: true })
      }).then(r => r.json())
    ]);

    res.status(200).json({
      success: true,
      category,
      userMessage,
      userData,
      response,
      debug: {
        birthChart: birthChart.planets ? 'Fetched successfully' : 'Failed',
        currentTransits: currentTransits.planets ? 'Fetched successfully' : 'Failed',
        birthChartSample: birthChart.planets ? {
          sun: birthChart.planets.sun,
          moon: birthChart.planets.moon
        } : null,
        currentTransitsSample: currentTransits.planets ? {
          sun: currentTransits.planets.sun,
          moon: currentTransits.planets.moon
        } : null
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
}