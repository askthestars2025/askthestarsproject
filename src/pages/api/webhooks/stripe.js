// pages/api/webhooks/stripe.js - ENHANCED VERSION
import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Enhanced Firebase Admin initialization with better error handling
if (!admin.apps.length) {
  try {
    // Validate required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Missing Firebase credentials in environment variables');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    throw error;
  }
}

const db = admin.firestore();

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // Add CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'stripe-signature');

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Enhanced environment variable validation
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe signature' });
    }

    console.log('Processing webhook with secret:', webhookSecret.substring(0, 10) + '...');
    console.log('Request signature:', sig.substring(0, 20) + '...');

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log('✅ Webhook signature verified successfully');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        webhookSecretPrefix: webhookSecret.substring(0, 10),
        signaturePrefix: sig.substring(0, 20),
        bodyLength: buf.length
      });
      return res.status(400).json({ error: `Invalid signature: ${err.message}` });
    }

    console.log('🎯 Processing webhook event:', event.type, 'ID:', event.id);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    res.status(200).json({ received: true, event_type: event.type });
  } catch (error) {
    console.error('💥 Webhook error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session) {
  try {
    console.log('🛒 Processing checkout completion:', session.id);
    
    const { userId, plan } = session.metadata;
    
    if (!userId || !plan) {
      console.error('❌ Missing metadata in checkout session:', session.metadata);
      throw new Error('Missing userId or plan in session metadata');
    }

    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    const subscriptionData = {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'active',
      plan: plan,
      subscriptionDate: new Date().toISOString(),
      subscriptionEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
      priceId: subscription.items.data[0].price.id,
      hasAcceptedTrial: true, // Important: Mark trial as accepted
      updatedAt: new Date().toISOString()
    };

    // Update user subscription in Firebase
    await updateUserSubscription(userId, subscriptionData);

    console.log(`✅ Subscription activated for user ${userId}, plan: ${plan}`);
  } catch (error) {
    console.error('💥 Error handling checkout completion:', error);
    throw error; // Re-throw to trigger webhook retry
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    console.log('🆕 Processing subscription creation:', subscription.id);
    
    const { userId } = subscription.metadata;
    
    if (!userId) {
      console.error('❌ Missing userId in subscription metadata:', subscription.metadata);
      return;
    }

    await updateUserSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionDate: new Date(subscription.created * 1000).toISOString(),
      subscriptionEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Subscription created for user ${userId}`);
  } catch (error) {
    console.error('💥 Error handling subscription creation:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('🔄 Processing subscription update:', subscription.id);
    
    const { userId } = subscription.metadata;
    
    if (!userId) {
      console.error('❌ Missing userId in subscription metadata:', subscription.metadata);
      return;
    }

    await updateUserSubscription(userId, {
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Subscription updated for user ${userId}, status: ${subscription.status}`);
  } catch (error) {
    console.error('💥 Error handling subscription update:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    console.log('🗑️ Processing subscription deletion:', subscription.id);
    
    const { userId } = subscription.metadata;
    
    if (!userId) {
      console.error('❌ Missing userId in subscription metadata:', subscription.metadata);
      return;
    }

    await updateUserSubscription(userId, {
      subscriptionStatus: 'cancelled',
      subscriptionEndDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Subscription cancelled for user ${userId}`);
  } catch (error) {
    console.error('💥 Error handling subscription deletion:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    console.log('💳 Processing successful payment:', invoice.id);
    
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const { userId } = subscription.metadata;
      
      if (userId) {
        await updateUserSubscription(userId, {
          subscriptionStatus: 'active',
          subscriptionEndDate: new Date(subscription.current_period_end * 1000).toISOString(),
          lastPaymentDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Payment processed for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('💥 Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice) {
  try {
    console.log('❌ Processing failed payment:', invoice.id);
    
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const { userId } = subscription.metadata;
      
      if (userId) {
        await updateUserSubscription(userId, {
          subscriptionStatus: subscription.status,
          lastPaymentFailure: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log(`⚠️ Payment failed for user ${userId}, status: ${subscription.status}`);
      }
    }
  } catch (error) {
    console.error('💥 Error handling payment failure:', error);
    throw error;
  }
}

// Enhanced Firebase update function
async function updateUserSubscription(userId, subscriptionData) {
  try {
    console.log('🔥 Updating user subscription in Firebase:', { userId, ...subscriptionData });
    
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    // Update the user document in Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.set(subscriptionData, { merge: true });
    
    console.log('✅ Successfully updated user subscription in Firebase');
    
    // Verify the update
    const updatedDoc = await userRef.get();
    if (updatedDoc.exists) {
      console.log('🔍 Updated user data:', updatedDoc.data());
    }
    
  } catch (error) {
    console.error('💥 Firebase update failed:', {
      userId,
      error: error.message,
      subscriptionData
    });
    throw error; // Re-throw to trigger webhook retry
  }
}