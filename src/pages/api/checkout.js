// pages/api/checkout.js - PRODUCTION VERSION
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define price data directly
const getPriceData = (plan) => {
  if (plan === 'weekly') {
    return {
      currency: 'usd',
      product_data: {
        name: 'Ask The Stars - Weekly Cosmic Access',
        description: 'Unlock all premium astrology features for 1 week'
      },
      unit_amount: 0, // $4.99 in cents
      recurring: {
        interval: 'week'
      }
    };
  } else if (plan === 'annual') {
    return {
      currency: 'usd', 
      product_data: {
        name: 'Ask The Stars - Annual Stellar Membership',
        description: 'Unlock all premium astrology features for 1 year'
      },
      unit_amount: 0, // $49.99 in cents
      recurring: {
        interval: 'year'
      }
    };
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId, email } = req.body;

    // Validate input
    if (!plan || !userId || !['weekly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan or missing userId' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Get price data for the plan
    const priceData = getPriceData(plan);
    if (!priceData) {
      return res.status(400).json({ error: 'Invalid plan configuration' });
    }

    console.log('Creating checkout with price_data:', priceData);

    // Create checkout session using price_data
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: priceData,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin || process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || process.env.NEXTAUTH_URL}/pricing?cancelled=true`,
      customer_email: email,
      metadata: {
        userId: userId.toString(),
        plan,
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          plan,
        }
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    });

    console.log('Checkout session created:', session.id);
    
    res.status(200).json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    
    // Return user-friendly error messages
    const errorMessages = {
      StripeCardError: 'Payment was declined',
      StripeRateLimitError: 'Too many requests, please try again',
      StripeInvalidRequestError: 'Invalid request',
      StripeAPIError: 'Payment service unavailable',
      StripeConnectionError: 'Network error, please try again',
    };

    const message = errorMessages[error.type] || 'Payment processing failed';
    const statusCode = error.type === 'StripeRateLimitError' ? 429 : 400;
    
    res.status(statusCode).json({ error: message });
  }
}
