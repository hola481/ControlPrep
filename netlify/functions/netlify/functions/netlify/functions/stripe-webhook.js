const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      console.log('Payment successful:', stripeEvent.data.object.id);
      break;
    case 'customer.subscription.deleted':
      console.log('Subscription cancelled:', stripeEvent.data.object.id);
      break;
    case 'invoice.payment_failed':
      console.log('Payment failed:', stripeEvent.data.object.customer);
      break;
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
