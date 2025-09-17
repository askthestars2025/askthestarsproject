// pages/api/webhooks/stripe.js - WORKING VERSION WITH MICRO
import { buffer } from 'micro';
import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use micro's buffer function (this is the key!)
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature - use buf directly, NOT buf.toString()
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    console.log('Processing webhook event:', event.type, event.id);
    
    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    console.log('Webhook processed successfully:', event.type);
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout completion for session:', session.id);
  
  const { userId, plan } = session.metadata || {};
  
  if (!userId || !plan) {
    console.error('Missing metadata:', { userId, plan });
    throw new Error('Missing userId or plan in session metadata');
  }

  console.log('Updating subscription for user:', userId, 'plan:', plan);

  // Get subscription details
  let subscription = null;
  if (session.subscription) {
    subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('Retrieved subscription:', subscription.id, 'status:', subscription.status);
  }
  
  const subscriptionData = {
    stripeCustomerId: session.customer,
    stripeSubscriptionId: subscription?.id || session.subscription,
    subscriptionStatus: 'active',
    plan: plan,
    subscriptionDate: new Date().toISOString(),
    subscriptionEndDate: subscription ? 
      new Date(subscription.current_period_end * 1000).toISOString() : null,
    hasAcceptedTrial: true,
    updatedAt: new Date().toISOString()
  };

  console.log('Updating Firebase with:', subscriptionData);
  await updateUserSubscription(userId, subscriptionData);
  console.log('Firebase update completed for user:', userId);
}

async function handleSubscriptionChange(subscription) {
  console.log('Processing subscription change:', subscription.id, subscription.status);
  
  const { userId } = subscription.metadata || {};
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const subscriptionData = {
    subscriptionStatus: subscription.status,
    subscriptionEndDate: subscription.status === 'active' ? 
      new Date(subscription.current_period_end * 1000).toISOString() : null,
    updatedAt: new Date().toISOString()
  };

  // If cancelled, keep access until period ends
  if (subscription.status === 'canceled' && subscription.current_period_end > Date.now() / 1000) {
    subscriptionData.subscriptionStatus = 'active';
  }

  await updateUserSubscription(userId, subscriptionData);
}

async function handlePaymentFailed(invoice) {
  console.log('Processing payment failure for invoice:', invoice.id);
  
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const { userId } = subscription.metadata || {};
  
  if (!userId) return;

  await updateUserSubscription(userId, {
    subscriptionStatus: 'payment_failed',
    updatedAt: new Date().toISOString()
  });
}

async function updateUserSubscription(userId, subscriptionData) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: ' + userId);
  }

  console.log('Updating Firebase for user:', userId);
  const userRef = db.collection('users').doc(userId);
  await userRef.set(subscriptionData, { merge: true });
  console.log('Firebase update successful for user:', userId);
}