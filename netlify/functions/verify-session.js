const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No session ID' }) };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    if (session.payment_status === 'paid') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          customerId: session.customer.id,
          subscriptionId: session.subscription.id,
          email: session.customer_details.email,
          billingPeriod: session.metadata.billingPeriod,
          currentPeriodEnd: session.subscription.current_period_end
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
