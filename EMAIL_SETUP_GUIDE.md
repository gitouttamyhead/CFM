# Email Notification System Setup Guide

This guide will help you set up the email notification system for the Come Follow Me insights application.

## Overview

The email notification system allows creators to send email notifications to users when new insights are created. It also provides the ability to resend notifications for existing insights.

## Important: EmailJS Limitations

**EmailJS Free Plan Limitations:**
- Recipient email verification is only available in the Pro plan ($15/month)
- Without verification, emails may not be delivered to recipients
- Only the sender's email address is guaranteed to receive emails

**Solutions:**
1. **Upgrade to EmailJS Pro** ($15/month) - Get recipient verification
2. **Use SendGrid** (Recommended) - Free tier with 100 emails/day, no verification needed
3. **Use Mailgun** - Free tier with 5,000 emails/month for 3 months
4. **Use Firebase Functions** - Server-side email sending

## Features

- **New Insight Notifications**: Send emails when creating new insights
- **Resend Notifications**: Resend emails for existing insights
- **User Selection**: Choose which users to notify
- **Direct Links**: Emails contain direct links to the insights
- **Notification Logging**: All sent notifications are logged in Firestore

## Setup Options

### Option 1: EmailJS (Current Setup)

#### EmailJS Account Setup
1. Go to [EmailJS](https://www.emailjs.com/) and create a free account
2. Verify your email address
3. Add your email service (Gmail, Outlook, etc.)

#### Create Email Template
1. In EmailJS dashboard, go to "Email Templates"
2. Click "Create New Template"
3. Use the template from `emailjs-template-example.html` as a reference
4. Save the template and note the **Template ID**

#### Configure EmailJS Settings
1. In EmailJS dashboard, go to "Account" → "API Keys"
2. Note your **Public Key**
3. Go to "Email Services" and note your **Service ID**

#### Update Configuration
Edit the `email-notifications.js` file and update the configuration:

```javascript
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID', // Replace with your EmailJS service ID
    templateId: 'YOUR_TEMPLATE_ID', // Replace with your template ID
    userId: 'YOUR_PUBLIC_KEY' // Replace with your EmailJS public key
};
```

#### For Pro Users: Verify Recipients
1. Upgrade to EmailJS Pro ($15/month)
2. Go to "Account" → "Email Verification"
3. Add and verify all recipient email addresses

### Option 2: SendGrid (Recommended Alternative)

#### SendGrid Setup
1. Go to [SendGrid](https://sendgrid.com/) and create a free account
2. Verify your sender email address
3. Create an API key with "Mail Send" permissions
4. Note your API key

#### Update Configuration
Edit the `email-notifications.js` file and update the SendGrid configuration:

```javascript
const ALTERNATIVE_EMAIL_CONFIG = {
    sendGridApiKey: 'YOUR_SENDGRID_API_KEY', // Add your SendGrid API key here
    fromEmail: 'your-email@gmail.com', // Your verified sender email
    fromName: 'Come Follow Me Insights'
};
```

#### Switch to SendGrid
To use SendGrid instead of EmailJS, modify the `sendInsightNotification` function to use `sendEmailWithSendGrid` instead of `emailjs.send`.

### Option 3: Firebase Functions (Advanced)

For a more robust solution, consider using Firebase Functions with a server-side email service.

## Usage

### For New Insights

1. Create a new insight as usual
2. Check the "Send email notification to users about this insight" checkbox
3. Save the insight
4. A modal will appear allowing you to select which users to notify
5. Select users and click "Send Notification"

### For Existing Insights

1. Navigate to any insight page
2. If you have admin/editor permissions, you'll see a "Resend Email" button
3. Click the button to open the user selection modal
4. Select users and send the notification

## Email Template Variables

The email template uses these variables:

- `{{to_email}}` - Recipient email addresses
- `{{insight_title}}` - Title of the insight
- `{{insight_summary}}` - Summary or preview of the insight content
- `{{insight_category}}` - Category (Old Testament, Gospel Topics, etc.)
- `{{insight_url}}` - Direct link to view the insight
- `{{action_type}}` - "created" or "updated"
- `{{creator_name}}` - Name of the person who created the insight
- `{{created_date}}` - Date the insight was created

## User Management

The system automatically fetches users from the `users` collection in Firestore. Each user document should have:

```javascript
{
    email: "user@example.com",
    name: "User Name", // Optional, defaults to email prefix
    role: "user" // user, editor, or admin
}
```

## Notification Logging

All sent notifications are logged in the `emailNotifications` collection with this structure:

```javascript
{
    insightId: "insight_document_id",
    recipientEmails: ["user1@example.com", "user2@example.com"],
    sentAt: timestamp,
    type: "new_insight" | "updated_insight",
    status: "sent"
}
```

## Troubleshooting

### Common Issues

1. **"EmailJS not available" error**
   - Make sure the EmailJS SDK is loaded before `email-notifications.js`
   - Check that the EmailJS script tag is present

2. **"No users found to notify"**
   - Ensure users exist in the `users` collection
   - Check that user documents have valid email addresses

3. **Email not sending**
   - Verify EmailJS configuration (service ID, template ID, user ID)
   - Check EmailJS dashboard for any service errors
   - Ensure your email service is properly configured

4. **Emails sent but not received**
   - **EmailJS Free Plan**: Recipients need to be verified (Pro plan only)
   - Check spam/junk folders
   - Verify sender email is properly configured
   - Consider switching to SendGrid or another service

5. **Template variables not working**
   - Verify template variable names match exactly
   - Check that the template is saved and published in EmailJS

### Testing

1. Create a test insight with email notification enabled
2. Send to a test email address
3. Check both the recipient's inbox and EmailJS dashboard
4. Verify the direct link works correctly

## Security Considerations

- EmailJS public key is safe to expose in client-side code
- SendGrid API keys should be kept secure (consider using environment variables)
- User email addresses are only used for notifications
- All email sending is logged for audit purposes
- Only admins and editors can send notifications

## Cost Considerations

- **EmailJS Free**: 200 emails/month (limited recipient verification)
- **EmailJS Pro**: $15/month (unlimited emails, recipient verification)
- **SendGrid Free**: 100 emails/day (no recipient verification needed)
- **Mailgun Free**: 5,000 emails/month for 3 months

## Future Enhancements

Potential improvements to consider:

1. **Email Preferences**: Allow users to opt out of notifications
2. **Notification Types**: Different templates for different insight categories
3. **Scheduled Notifications**: Send notifications at specific times
4. **Bulk Operations**: Send notifications for multiple insights
5. **Email Analytics**: Track open rates and click-through rates 