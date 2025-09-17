// pages/api/debug-stripe.js
// Create this file to debug your Stripe account
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Debugging Stripe account...');

    // Get account information
    const account = await stripe.accounts.retrieve();
    
    // List all prices
    const prices = await stripe.prices.list({ limit: 20 });
    
    // List all products
    const products = await stripe.products.list({ limit: 20 });

    const debugInfo = {
      account: {
        id: account.id,
        email: account.email,
        display_name: account.display_name,
        country: account.country,
        created: account.created ? new Date(account.created * 1000).toISOString() : 'N/A'
      },
      prices: prices.data.map(price => ({
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count,
        product: price.product,
        active: price.active
      })),
      products: products.data.map(product => ({
        id: product.id,
        name: product.name,
        active: product.active,
        created: product.created ? new Date(product.created * 1000).toISOString() : 'N/A'
      })),
      lookingFor: {
        weeklyPriceId: process.env.STRIPE_WEEKLY_PRICE_ID,
        annualPriceId: process.env.STRIPE_ANNUAL_PRICE_ID
      }
    };

    console.log('Stripe Debug Info:', debugInfo);
    
    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Stripe debug error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      type: error.type
    });
  }
}