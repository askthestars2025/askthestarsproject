// pages/api/webhooks/stripe.js - DEBUG VERSION
export default async function handler(req, res) {
    console.log('Webhook called with method:', req.method);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const checks = {
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      };
      
      console.log('Environment check:', checks);
      
      return res.status(200).json({ 
        message: 'Webhook working',
        env_check: checks
      });
      
    } catch (error) {
      console.error('Webhook error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }