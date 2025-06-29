const sgMail = require('@sendgrid/mail');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const { to, subject, html } = JSON.parse(event.body);

    const msg = {
      to,
      from: 'comefollowmeapp@gmail.com', // Your verified sender
      subject,
      html,
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
