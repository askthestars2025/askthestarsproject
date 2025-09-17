// pages/api/webhooks/stripe.js - DETAILED ERROR LOGGING VERSION
import { buffer } from 'micro';
import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.error('Full error:', error);
  }
}

const db = admin.firestore();

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  console.log('🚀 Webhook request received:', req.method);
  
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Step 1: Getting buffer...');
    const buf = await buffer(req);
    console.log('✅ Step 1 SUCCESS: Buffer length:', buf.length);
    
    console.log('🔑 Step 2: Getting signature...');
    const sig = req.headers['stripe-signature'];
    console.log('✅ Step 2 SUCCESS: Signature present:', !!sig);
    
    if (!webhookSecret) {
      console.error('❌ Step 3 FAIL: STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    console.log('✅ Step 3 SUCCESS: Webhook secret configured');

    console.log('🔐 Step 4: Verifying signature...');
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log('✅ Step 4 SUCCESS: Signature verified, event type:', event.type);
    } catch (err) {
      console.error('❌ Step 4 FAIL: Signature verification failed:', err.message);
      console.error('Error details:', err);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    console.log('🎯 Step 5: Processing event type:', event.type);
    console.log('📋 Event ID:', event.id);
    
    // Handle events with detailed logging
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('🛒 Processing checkout completion...');
          await handleCheckoutCompleted(event.data.object);
          console.log('✅ Checkout completion processed successfully');
          break;
        
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          console.log('🔄 Processing subscription change...');
          await handleSubscriptionChange(event.data.object);
          console.log('✅ Subscription change processed successfully');
          break;
        
        case 'invoice.payment_failed':
          console.log('❌ Processing payment failure...');
          await handlePaymentFailed(event.data.object);
          console.log('✅ Payment failure processed successfully');
          break;
        
        default:
          console.log(`ℹ️ Unhandled event: ${event.type}`);
      }
    } catch (processingError) {
      console.error('❌ ERROR during event processing:', processingError.message);
      console.error('Processing error stack:', processingError.stack);
      console.error('Event data:', JSON.stringify(event.data.object, null, 2));
      throw processingError; // Re-throw to be caught by outer catch
    }

    console.log('✅ Webhook processed successfully');
    res.status(200).json({ received: true, event_type: event.type });
    
  } catch (error) {
    console.error('💥 WEBHOOK ERROR:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    res.status(400).json({ 
      error: 'Webhook processing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('🛒 CHECKOUT SESSION DETAILS:');
  console.log('- Session ID:', session.id);
  console.log('- Customer:', session.customer);
  console.log('- Subscription:', session.subscription);
  console.log('- Metadata:', JSON.stringify(session.metadata, null, 2));
  console.log('- Status:', session.status);
  console.log('- Payment status:', session.payment_status);
  
  const { userId, plan } = session.metadata || {};
  
  if (!userId) {
    console.error('❌ Missing userId in metadata');
    throw new Error('Missing userId in session metadata');
  }
  
  if (!plan) {
    console.error('❌ Missing plan in metadata');
    throw new Error('Missing plan in session metadata');
  }

  console.log('👤 User ID:', userId);
  console.log('📋 Plan:', plan);

  // Get subscription details
  let subscription = null;
  if (session.subscription) {
    try {
      console.log('📝 Retrieving subscription from Stripe...');
      subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log('✅ Subscription retrieved:', subscription.id, 'status:', subscription.status);
    } catch (subError) {
      console.error('❌ Failed to retrieve subscription:', subError.message);
      // Continue without subscription details
    }
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

  console.log('💾 Preparing to update Firebase with:', JSON.stringify(subscriptionData, null, 2));
  
  try {
    await updateUserSubscription(userId, subscriptionData);
    console.log('✅ Firebase update completed successfully');
  } catch (firebaseError) {
    console.error('❌ Firebase update failed:', firebaseError.message);
    console.error('Firebase error stack:', firebaseError.stack);
    throw firebaseError;
  }
}

async function handleSubscriptionChange(subscription) {
  console.log('🔄 Processing subscription change:', subscription.id, subscription.status);
  // Implementation here...
}

async function handlePaymentFailed(invoice) {
  console.log('❌ Processing payment failure for invoice:', invoice.id);
  // Implementation here...
}

async function updateUserSubscription(userId, subscriptionData) {
  console.log('🔥 FIREBASE UPDATE ATTEMPT:');
  console.log('- User ID:', userId);
  console.log('- User ID type:', typeof userId);
  console.log('- Data:', JSON.stringify(subscriptionData, null, 2));
  
  if (!userId || typeof userId !== 'string') {
    console.error('❌ Invalid userId:', userId);
    throw new Error('Invalid userId: ' + userId);
  }

  try {
    console.log('📄 Getting user document reference...');
    const userRef = db.collection('users').doc(userId);
    
    console.log('📋 Checking if user document exists...');
    const userDoc = await userRef.get();
    console.log('📄 User document exists:', userDoc.exists);
    
    if (userDoc.exists) {
      console.log('📋 Current user data:', JSON.stringify(userDoc.data(), null, 2));
    }
    
    console.log('💾 Updating user document...');
    await userRef.set(subscriptionData, { merge: true });
    console.log('✅ Firebase set operation completed');
    
    console.log('🔍 Verifying update...');
    const updatedDoc = await userRef.get();
    if (updatedDoc.exists) {
      console.log('✅ Update verified, user data:', JSON.stringify(updatedDoc.data(), null, 2));
    } else {
      console.error('❌ User document not found after update!');
    }
    
  } catch (error) {
    console.error('❌ Firebase operation failed:', error.message);
    console.error('Firebase error code:', error.code);
    console.error('Firebase error stack:', error.stack);
    console.error('Environment check:');
    console.error('- FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
    console.error('- FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.error('- FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
    throw error;
  }
}