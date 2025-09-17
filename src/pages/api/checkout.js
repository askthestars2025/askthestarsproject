// pages/api/checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define your price IDs (create these in Stripe Dashboard or via API)
const STRIPE_PRICES = {
  weekly: process.env.STRIPE_WEEKLY_PRICE_ID || 'price_weekly_placeholder',
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || 'price_annual_placeholder'
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId, email } = req.body;

    // Validate input
    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing required fields: plan and userId' });
    }

    if (!['weekly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return res.status(500).json({ error: 'Payment system configuration error' });
    }

    // Check if price IDs are configured
    if (!STRIPE_PRICES[plan] || STRIPE_PRICES[plan].includes('placeholder')) {
      console.error(`Stripe price ID not configured for plan: ${plan}`);
      return res.status(500).json({ error: 'Subscription plan not available' });
    }

    console.log('Creating subscription checkout session for:', { plan, userId, email });

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: STRIPE_PRICES[plan],
        quantity: 1,
      }],
      mode: 'subscription', // Changed to subscription for recurring billing
      success_url: `${req.headers.origin || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/pricing?cancelled=true`,
      customer_email: email || undefined,
      metadata: {
        userId: userId.toString(),
        plan,
        type: 'astrology_subscription'
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true, // Allow discount codes
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          plan
        }
      },
      // Automatic tax calculation (optional but recommended)
      automatic_tax: {
        enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true'
      }
    });

    console.log('Subscription checkout session created:', session.id);
    
    // Return the checkout URL
    res.status(200).json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Stripe checkout error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      userId: req.body?.userId,
      plan: req.body?.plan
    });

    // Return appropriate error message
    if (error.type === 'StripeCardError') {
      res.status(400).json({ error: 'Card was declined' });
    } else if (error.type === 'StripeRateLimitError') {
      res.status(429).json({ error: 'Rate limit exceeded, please try again later' });
    } else if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid request parameters' });
    } else if (error.type === 'StripeAPIError') {
      res.status(502).json({ error: 'Payment service temporarily unavailable' });
    } else if (error.type === 'StripeConnectionError') {
      res.status(503).json({ error: 'Network error, please try again' });
    } else {
      res.status(500).json({
        error: 'Payment processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}