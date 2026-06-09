const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASS_DAYS = 400; // one-time pass length; keep in step with verify-session

async function grantPremium(userId, fields) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(fields)
  });
  if (!res.ok) console.error('Supabase update failed:', res.status, await res.text());
  else console.log('Premium granted to', userId);
}

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const userId = session.client_reference_id || (session.metadata && session.metadata.supabase_user_id);
      if (userId && session.payment_status === 'paid') {
        let premiumUntil, subId = null;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
          subId = sub.id;
        } else {
          premiumUntil = new Date(Date.now() + PASS_DAYS * 24 * 60 * 60 * 1000).toISOString();
        }
        await grantPremium(userId, {
          is_premium: true,
          premium_until: premiumUntil,
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: subId
        });
      } else {
        console.log('checkout.session.completed without userId/paid:', session.id);
      }
    } else if (stripeEvent.type === 'customer.subscription.deleted') {
      console.log('Subscription cancelled:', stripeEvent.data.object.id);
    } else if (stripeEvent.type === 'invoice.payment_failed') {
      console.log('Payment failed:', stripeEvent.data.object.customer);
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
