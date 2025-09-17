// pages/api/checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId, email } = req.body;

    // Validate input
    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing plan or userId' });
    }

    // Validate that we have the required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Create dynamic price data for the checkout session
    const lineItems = plan === 'weekly' 
      ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Weekly Cosmic Access',
              description: 'Unlock all premium astrology features for 1 week',
              images: ['https://your-domain.com/assets/ask-logo.png'], // Optional: Add your logo
            },
            unit_amount: 99, // $4.99 in cents
          },
          quantity: 1,
        }]
      : [{
          price_data: {
            currency: 'usd', 
            product_data: {
              name: 'Annual Cosmic Membership',
              description: 'Unlock all premium astrology features for 1 year',
              images: ['https://your-domain.com/assets/ask-logo.png'], // Optional: Add your logo
            },
            unit_amount: 99, // $49.99 in cents
          },
          quantity: 1,
        }];

    console.log('Creating checkout session for:', { plan, userId });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment', // One-time payment
      success_url: `${req.headers.origin || 'http://localhost:3000'}?success=true&plan=${plan}`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}?cancelled=true`,
      customer_email: email || undefined,
      metadata: { 
        userId,
        plan,
        type: 'astrology_subscription'
      },
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: [
          'US', // United States
          'CA', // Canada
          'GB', // United Kingdom
          'AU', // Australia
          'IN', // India
          'DE', // Germany
          'FR', // France
          'SG', // Singapore
          'NZ', // New Zealand
          'IT', // Italy
        ],
      },
      
    });

    console.log('Checkout session created:', session.id);
    
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment processing error'
    });
  }
}