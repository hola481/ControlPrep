const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PASS_DAYS = 400; // one-time "acceso hasta el examen" — set to the exam date when known
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No session ID' }) };
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'customer'] });
    if (session.payment_status === 'paid') {
      const sub = session.subscription;   // null for one-time
      const cust = session.customer;      // object or null
      const currentPeriodEnd = sub
        ? sub.current_period_end
        : Math.floor(Date.now() / 1000) + PASS_DAYS * 24 * 60 * 60;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          customerId: cust ? cust.id : null,
          subscriptionId: sub ? sub.id : null,
          email: session.customer_details?.email || (cust && cust.email) || null,
          billingPeriod: session.metadata?.billingPeriod,
          currentPeriodEnd
        })
      };
    }
    return { statusCode: 200, body: JSON.stringify({ success: false }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
