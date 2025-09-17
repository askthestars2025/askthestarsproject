// pages/api/webhooks/stripe.js - SIMPLE REST API VERSION
import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: { bodyParser: false },
};

// Simple Firebase update using REST API (no Admin SDK needed)
async function updateUserSubscription(userId, data) {
  try {
    console.log('Updating user via REST API:', userId);
    
    // Convert data to Firestore REST format
    const fields = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'boolean') {
        fields[key] = { booleanValue: data[key] };
      } else {
        fields[key] = { stringValue: String(data[key]) };
      }
    });

    // Use Firebase REST API
    const url = `https://firestore.googleapis.com/v1/projects/askthestars-37936/databases/(default)/documents/users/${userId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fields,
        updateMask: {
          fieldPaths: Object.keys(data)
        }
      })
    });

    if (response.ok) {
      console.log('✅ Firebase update successful for user:', userId);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Firebase update failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase update error:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Stripe webhook
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    
    console.log('Processing webhook event:', event.type);
    
    // Handle checkout completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, plan } = session.metadata || {};
      
      if (userId && plan) {
        console.log('Processing checkout for user:', userId, 'plan:', plan);
        
        const subscriptionData = {
          subscriptionStatus: 'active',
          plan: plan,
          stripeCustomerId: session.customer || '',
          stripeSubscriptionId: session.subscription || '',
          hasAcceptedTrial: true,
          subscriptionDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const success = await updateUserSubscription(userId, subscriptionData);
        
        if (success) {
          console.log('✅ Subscription activated for user:', userId);
        } else {
          console.log('❌ Failed to activate subscription for user:', userId);
        }
      } else {
        console.log('ℹ️ No userId/plan in metadata - skipping update');
      }
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}