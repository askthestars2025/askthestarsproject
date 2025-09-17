// pages/api/webhooks/stripe.js - MINIMAL ADMIN SDK VERSION
import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: { bodyParser: false },
};

// Minimal Firebase Admin setup (only when needed)
let adminDb = null;

async function getAdminDb() {
  if (adminDb) return adminDb;
  
  const admin = await import('firebase-admin');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: "askthestars-37936",
        client_email: "firebase-adminsdk-ay29r@askthestars-37936.iam.gserviceaccount.com",
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
  
  adminDb = admin.firestore();
  return adminDb;
}

// Simple update function - same pattern as your onboarding
async function updateUserSubscription(userId, data) {
  try {
    const db = await getAdminDb();
    const userRef = db.collection('users').doc(userId);
    
    // Same pattern as: await setDoc(doc(db, 'users', user.uid), dataToSave);
    await userRef.set(data, { merge: true });
    
    console.log('✅ Updated user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Update failed:', error.message);
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
    
    // Handle checkout completion (same logic as your onboarding)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, plan } = session.metadata || {};
      
      if (userId && plan) {
        console.log('Processing:', userId, plan);
        
        // Same data structure as your onboarding
        const subscriptionData = {
          subscriptionStatus: 'active',
          plan: plan,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          hasAcceptedTrial: true,
          subscriptionDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await updateUserSubscription(userId, subscriptionData);
      }
    }

    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}