// pages/api/cancel-subscription.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId, userId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscription ID' });
    }

    // First, retrieve the subscription to check its current status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log(`Subscription ${subscriptionId} status: ${subscription.status}`);

    let result;
    let message;

    switch (subscription.status) {
      case 'active':
      case 'trialing':
        // For active or trialing subscriptions, cancel at period end
        result = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
        message = 'Subscription will be cancelled at the end of the current billing period';
        break;

      case 'incomplete':
        // For incomplete subscriptions, we can try to cancel immediately
        try {
          result = await stripe.subscriptions.cancel(subscriptionId);
          message = 'Incomplete subscription cancelled immediately';
        } catch (error) {
          // If cancelling fails, try deleting
          result = await stripe.subscriptions.del(subscriptionId);
          message = 'Incomplete subscription deleted';
        }
        break;

      case 'incomplete_expired':
      case 'past_due':
        // For expired or past due subscriptions, cancel immediately
        result = await stripe.subscriptions.cancel(subscriptionId);
        message = 'Subscription cancelled immediately';
        break;

      case 'canceled':
      case 'unpaid':
        // Already cancelled or unpaid
        return res.status(200).json({
          success: true,
          message: 'Subscription is already cancelled',
          status: subscription.status
        });

      default:
        // For any other status, try to cancel immediately
        result = await stripe.subscriptions.cancel(subscriptionId);
        message = 'Subscription cancelled';
    }

    // Calculate end date
    let endsAt = null;
    if (result.cancel_at_period_end && result.current_period_end) {
      endsAt = new Date(result.current_period_end * 1000).toISOString();
    } else if (result.canceled_at) {
      endsAt = new Date(result.canceled_at * 1000).toISOString();
    }

    res.status(200).json({
      success: true,
      message,
      endsAt,
      status: result.status,
      cancelAtPeriodEnd: result.cancel_at_period_end || false
    });

  } catch (error) {
    console.error('Cancel subscription error:', error.message);
    
    // Provide more specific error messages based on Stripe error types
    let errorMessage = 'Failed to cancel subscription';
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('No such subscription')) {
        errorMessage = 'Subscription not found';
      } else if (error.message.includes('incomplete_expired')) {
        errorMessage = 'This subscription has expired and cannot be cancelled normally. Please contact support.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(400).json({
      error: errorMessage,
      details: error.message,
      type: error.type || 'unknown'
    });
  }
}