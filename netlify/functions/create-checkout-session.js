const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { priceId, billingPeriod, consentRecord, userId, email } = JSON.parse(event.body);
    if (!priceId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing priceId' }) };
    const isSubscription = billingPeriod === 'monthly';
    const params = {
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://controlprep.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://controlprep.com/cancel',
locale: 'es',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      client_reference_id: userId || undefined,
      customer_email: email || undefined,
      metadata: {
        billingPeriod: billingPeriod || 'unknown',
        supabase_user_id: userId || '',
        consentTimestamp: consentRecord?.date || new Date().toISOString(),
        consentWithdrawal: 'true',
        consentTerms: 'true'
      }
    };
    if (isSubscription) {
      params.subscription_data = { metadata: { billingPeriod: billingPeriod || 'unknown', supabase_user_id: userId || '' } };
    } else {
      params.customer_creation = 'always';
    }
    const session = await stripe.checkout.sessions.create(params);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
  } catch (error) {
    console.error('Stripe error:', error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
