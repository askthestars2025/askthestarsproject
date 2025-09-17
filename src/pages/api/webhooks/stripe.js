// pages/api/webhooks/stripe.js - FINAL REST API VERSION
import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: { bodyParser: false },
};

// Firebase REST API update function
async function updateUserSubscription(userId, data) {
  try {
    console.log('Updating user via Firebase REST API:', userId);
    
    // Convert data to Firestore REST format
    const fields = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'boolean') {
        fields[key] = { booleanValue: data[key] };
      } else {
        fields[key] = { stringValue: String(data[key]) };
      }
    });

    // Build Firebase REST API URL with updateMask as query parameters
    const fieldPaths = Object.keys(data).map(key => `updateMask.fieldPaths=${key}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/askthestars-37936/databases/(default)/documents/users/${userId}?${fieldPaths}`;
    
    console.log('Firebase REST API URL:', url);
    console.log('Update data:', JSON.stringify(fields, null, 2));
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fields
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Firebase update successful for user:', userId);
      console.log('Response:', JSON.stringify(result, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Firebase update failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase update error:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

export default async function handler(req, res) {
  console.log('🚀 Webhook received:', req.method);
  
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Getting buffer...');
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    console.log('🔑 Buffer length:', buf.length);
    console.log('🔐 Signature present:', !!sig);
    
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    console.log('🔐 Verifying signature...');
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log('✅ Signature verified successfully');
    } catch (err) {
      console.error('❌ Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    console.log('🎯 Processing event:', event.type, 'ID:', event.id);
    
    // Handle checkout completion (main event for subscription activation)
    if (event.type === 'checkout.session.completed') {
      console.log('🛒 Processing checkout completion...');
      const session = event.data.object;
      
      console.log('Session details:');
      console.log('- Session ID:', session.id);
      console.log('- Customer:', session.customer);
      console.log('- Subscription:', session.subscription);
      console.log('- Metadata:', JSON.stringify(session.metadata, null, 2));
      console.log('- Status:', session.status);
      console.log('- Payment status:', session.payment_status);
      
      const { userId, plan } = session.metadata || {};
      
      if (!userId) {
        console.error('❌ No userId in session metadata');
        console.log('Available metadata:', session.metadata);
        return res.status(200).json({ received: true, warning: 'No userId in metadata' });
      }
      
      if (!plan) {
        console.error('❌ No plan in session metadata');
        console.log('Available metadata:', session.metadata);
        return res.status(200).json({ received: true, warning: 'No plan in metadata' });
      }
      
      console.log('👤 Processing subscription for user:', userId, 'plan:', plan);
      
      // Get subscription end date if available
      let subscriptionEndDate = null;
      if (session.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (subscription.current_period_end) {
            subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
            console.log('📅 Subscription end date:', subscriptionEndDate);
          }
        } catch (subError) {
          console.error('❌ Failed to retrieve subscription details:', subError.message);
        }
      }
      
      // Prepare subscription data
      const subscriptionData = {
        subscriptionStatus: 'active',
        plan: plan,
        stripeCustomerId: session.customer || '',
        stripeSubscriptionId: session.subscription || '',
        hasAcceptedTrial: true,
        subscriptionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add end date if available
      if (subscriptionEndDate) {
        subscriptionData.subscriptionEndDate = subscriptionEndDate;
      }

      console.log('💾 Subscription data to save:', JSON.stringify(subscriptionData, null, 2));
      
      // Update Firebase
      const success = await updateUserSubscription(userId, subscriptionData);
      
      if (success) {
        console.log('🎉 Subscription activated successfully for user:', userId);
      } else {
        console.error('❌ Failed to activate subscription for user:', userId);
      }
      
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type} - skipping processing`);
    }

    console.log('✅ Webhook processed successfully');
    res.status(200).json({ 
      received: true, 
      event_type: event.type,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Webhook processing error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(400).json({ 
      error: 'Webhook processing failed',
      details: error.message
    });
  }
}