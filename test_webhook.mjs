import crypto from 'crypto';

const SECRET = '272006';
const URL = 'https://hidden-herring-940.convex.site/lemon-squeezy-webhook';

const payload = {
  meta: {
    event_name: 'subscription_created',
    custom_data: {
      user_id: 'test_user_from_script',
      plan: 'pro',
      billing: 'monthly'
    }
  },
  data: {
    id: 'test_order_999',
    attributes: {
      user_email: 'test@example.com',
      status: 'active'
    }
  }
};

const body = JSON.stringify(payload);
const hmac = crypto.createHmac('sha256', SECRET);
const signature = hmac.update(body).digest('hex');

console.log('Sending webhook simulation...');
console.log('URL:', URL);
console.log('Signature:', signature);

try {
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature
    },
    body: body
  });

  const responseText = await response.text();
  console.log('Response Status:', response.status);
  console.log('Response Body:', responseText);
} catch (error) {
  console.error('Error sending request:', error);
}
