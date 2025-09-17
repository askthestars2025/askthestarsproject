// pages/api/webhooks/stripe.js - MINIMAL PRODUCTION VERSION
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

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    
    // Handle essential events only
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
        // Log unhandled events but don't fail
        console.log(`Unhandled event: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  const { userId, plan } = session.metadata || {};
  
  if (!userId || !plan) {
    throw new Error('Missing userId or plan in session metadata');
  }

  // Get subscription details
  let subscription = null;
  if (session.subscription) {
    subscription = await stripe.subscriptions.retrieve(session.subscription);
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

  await updateUserSubscription(userId, subscriptionData);
}

async function handleSubscriptionChange(subscription) {
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

  const userRef = db.collection('users').doc(userId);
  await userRef.set(subscriptionData, { merge: true });
}