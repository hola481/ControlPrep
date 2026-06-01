const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { priceId, billingPeriod, consentRecord } = JSON.parse(event.body);

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing priceId' }) };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://controlprep.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://controlprep.com/cancel',
      locale: 'es',
      automatic_tax: { enabled: true },
      metadata: {
        billingPeriod: billingPeriod || 'unknown',
        consentTimestamp: consentRecord?.date || new Date().toISOString(),
        consentWithdrawal: 'true',
        consentTerms: 'true'
      },
      subscription_data: {
        metadata: {
          billingPeriod: billingPeriod || 'unknown',
          consentTimestamp: consentRecord?.date || new Date().toISOString()
        }
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
