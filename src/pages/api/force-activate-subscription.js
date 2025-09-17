// pages/api/force-activate-subscription.js
import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, sessionId, plan } = req.body;

  if (!userId || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log('Force activating subscription for:', { userId, sessionId, plan });

    // Get the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Retrieved session:', {
      id: session.id,
      payment_status: session.payment_status,
      subscription: session.subscription,
      customer: session.customer
    });

    // Get subscription details if it exists
    let subscriptionData;
    
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription, {
        expand: ['items.data.price']
      });
      console.log('Full subscription object:', JSON.stringify(subscription, null, 2));

      // Get the correct current_period_end from subscription items
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
      console.log('Current period end timestamp:', currentPeriodEnd);

      // Handle period end date properly
      const endDate = currentPeriodEnd ? 
        new Date(currentPeriodEnd * 1000).toISOString() : 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to 1 week from now

      console.log('Calculated end date:', endDate);

      subscriptionData = {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: 'active',
        plan: plan || 'weekly',
        subscriptionDate: new Date().toISOString(),
        subscriptionEndDate: endDate,
        priceId: subscription.items.data[0]?.price.id,
        hasAcceptedTrial: true,
        updatedAt: new Date().toISOString(),
        manuallyActivated: true // Flag to indicate this was manually activated
      };
    } else {
      console.log('No subscription found in session, creating basic subscription data');
      // Fallback if no subscription (for one-time payments)
      subscriptionData = {
        stripeCustomerId: session.customer,
        subscriptionStatus: 'active',
        plan: plan || 'weekly',
        subscriptionDate: new Date().toISOString(),
        subscriptionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        hasAcceptedTrial: true,
        updatedAt: new Date().toISOString(),
        manuallyActivated: true
      };
    }

    console.log('Updating Firebase with data:', subscriptionData);

    // Validate data before Firebase update
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId: ' + userId);
    }

    // Clean the data - remove any undefined values that might cause issues
    const cleanData = Object.fromEntries(
      Object.entries(subscriptionData).filter(([_, v]) => v !== undefined && v !== null)
    );

    console.log('Clean data for Firebase:', cleanData);

    // Update Firebase with error handling
    const userRef = db.collection('users').doc(userId);
    
    try {
      await userRef.set(cleanData, { merge: true });
      console.log('Firebase update successful');
    } catch (firebaseError) {
      console.error('Firebase update failed:', {
        error: firebaseError.message,
        code: firebaseError.code,
        userId,
        dataKeys: Object.keys(cleanData)
      });
      throw new Error(`Firebase update failed: ${firebaseError.message}`);
    }

    console.log('Firebase update successful');

    // Verify the update
    const updatedDoc = await db.collection('users').doc(userId).get();
    const updatedData = updatedDoc.data();

    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      subscriptionData: updatedData
    });

  } catch (error) {
    console.error('Error force-activating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to activate subscription', 
      details: error.message 
    });
  }
}