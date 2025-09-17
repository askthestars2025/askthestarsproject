// pages/api/cancel-subscription.js - CREATE THIS FILE
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscription ID' });
    }

    // Cancel subscription at period end (keeps access until then)
    const cancelledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.status(200).json({ 
      success: true, 
      message: 'Subscription cancelled successfully',
      endsAt: new Date(cancelledSubscription.current_period_end * 1000).toISOString()
    });

  } catch (error) {
    console.error('Cancel subscription error:', error.message);
    res.status(400).json({ 
      error: 'Failed to cancel subscription',
      details: error.message 
    });
  }
}