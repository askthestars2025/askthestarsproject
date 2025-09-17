// pages/api/checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define price data directly (workaround for price ID issue)
const getPriceData = (plan) => {
  if (plan === 'weekly') {
    return {
      currency: 'usd',
      product_data: {
        name: 'Ask The Stars - Weekly Cosmic Access',
        description: 'Unlock all premium astrology features for 1 week'
      },
      unit_amount: 499, // $4.99 in cents
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
      unit_amount: 4999, // $49.99 in cents
      recurring: {
        interval: 'year'
      }
    };
  }
  return null;
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

    // Get price data for the plan
    const priceData = getPriceData(plan);
    if (!priceData) {
      return res.status(400).json({ error: 'Invalid plan configuration' });
    }

    console.log('Creating subscription checkout session for:', { plan, userId, email });
    console.log('Using price_data approach (workaround for price ID issue)');

    // Create checkout session using price_data instead of price IDs
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: priceData,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://lunatica-client.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://lunatica-client.vercel.app'}/pricing?cancelled=true`,
      customer_email: email || undefined,
      metadata: {
        userId: userId.toString(),
        plan,
        type: 'astrology_subscription'
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          plan
        }
      },
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