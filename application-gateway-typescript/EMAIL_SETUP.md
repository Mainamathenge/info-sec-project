# Mailtrap Email Notifications Setup Guide

## Overview

The package management system now sends beautiful HTML emails using Mailtrap for:
- 📦 **New Package Versions** - When packages are published
- ⚠️ **Version Disabled** - When admins disable a version  
- 🚫 **Package Discontinued** - When admins discontinue a package

---

## Configuration

### 1. Get Mailtrap API Token

1. Sign up at [Mailtrap.io](https://mailtrap.io)
2. Go to **Sending Domains** → **Create Domain** or use their test domain
3. Navigate to **API Tokens** → **Create Token**
4. Copy your API token

### 2. Update .env File

Replace the placeholder in your `.env` file:

```bash
# Email Configuration (Mailtrap)
MAILTRAP_TOKEN=your_actual_token_here
MAILTRAP_SENDER_EMAIL=noreply@yourdomain.com
MAILTRAP_SENDER_NAME=Package Management System
```

**Example:**
```bash
MAILTRAP_TOKEN=abc123def456ghi789jkl012mno345
MAILTRAP_SENDER_EMAIL=notifications@packagemanager.com
MAILTRAP_SENDER_NAME=My Package Manager
```

---

## Email Templates

### 1. New Package Version

**Triggered when:** User publishes a new package version

**Sent to:** All users subscribed to the package

**Subject:** `New Version: [Package Name] [Version]`

**Content:**
- Package name and ID
- New version number
- Link to view package
- Unsubscribe information

### 2. Version Disabled

**Triggered when:** Admin disables a version

**Sent to:** All users subscribed to the package

**Subject:** `Version Disabled: [Package ID] [Version]`

**Content:**
- Warning about version being disabled
- Package and version details
- Recommendation to update

### 3. Package Discontinued

**Triggered when:** Admin permanently discontinues a package

**Sent to:** All users subscribed to the package

**Subject:** `Package Discontinued: [Package ID]`

**Content:**
- Alert about package discontinuation
- All versions no longer available
- Migration recommendation

---

## Testing Email Notifications

### Test 1: Subscribe to a Package

```bash
# Login first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}'

# Save the token
TOKEN="<your_jwt_token>"

# Subscribe to a package
curl -X POST http://localhost:3000/subscriptions/com.test.app \
  -H "Authorization: Bearer $TOKEN"
```

### Test 2: Publish New Version (Triggers Email)

```bash
curl -X POST http://localhost:3000/packages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "com.test.app",
    "version": "2.0.0",
    "fileHash": "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "name": "Test App",
    "description": "New version test"
  }'
```

✅ **Expected:** Email sent to all subscribers with "New Version" template

### Test 3: Check Console Logs

```bash
# Start the backend
npm start

# Look for:
# ✅ Email sent to user@example.com: New Version: Test App 2.0.0
```

---

## Mailtrap Dashboard

After sending emails, check your Mailtrap dashboard:

1. Go to **Inboxes** or **Sending Domains**
2. Click on your domain/inbox
3. View sent emails
4. Check delivery status
5. Preview HTML rendering

---

## Email Service API

### Sending Custom Emails

```typescript
import { emailService } from './config/email';

// Send a simple email
await emailService.sendEmail(
    'user@example.com',
    'Subject Line',
    '<h1>HTML Content</h1>',
    'Plain text content'
);

// Send bulk emails
await emailService.sendBulkEmails([
    {
        to: 'user1@example.com',
        subject: 'Hello User 1',
        html: '<p>Message</p>'
    },
    {
        to: 'user2@example.com',
        subject: 'Hello User 2',
        html: '<p>Message</p>'
    }
]);
```

### Using Email Templates

```typescript
import { emailService } from './config/email';

// Generate package update email
const { html, text } = emailService.generatePackageUpdateEmail(
    'com.example.app',
    '1.0.0',
    'My Application'
);

await emailService.sendEmail(
    'user@example.com',
    'New Version Available',
    html,
    text
);
```

---

## Customizing Email Templates

Email templates are in [`src/config/email.ts`](file:///Users/mac/Documents/cmu/fall-25/compiled/application-gateway-typescript/src/config/email.ts)

### Modify Templates

```typescript
generatePackageUpdateEmail(packageId: string, version: string, packageName: string) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            /* Add your custom styles */
            .custom-class { color: blue; }
        </style>
    </head>
    <body>
        <!-- Your custom HTML -->
    </body>
    </html>
    `;
    
    const text = `Your plain text version`;
    
    return { html, text };
}
```

---

## Troubleshooting

### Issue: "Email Not Sent - No Config"

**Cause:** `MAILTRAP_TOKEN` not set in `.env`

**Fix:**
```bash
# Add your token to .env
MAILTRAP_TOKEN=your_actual_token_here

# Restart the backend
npm start
```

### Issue: Email Sending Fails

**Check:**
1. Token is valid (not expired)
2. Sender email is verified in Mailtrap
3. Check Mailtrap dashboard for errors
4. View console logs for error messages

### Issue: Emails in Spam

**Solutions:**
1. In Mailtrap, verify your sending domain
2. Add SPF and DKIM records
3. Use a professional sender email
4. Avoid spam trigger words in subject/content

---

## Production Considerations

> [!WARNING]
> **Before Production:**
> - Use a verified sending domain
> - Configure SPF, DKIM, and DMARC records
> - Use environment-specific sender emails
> - Implement email rate limiting
> - Add unsubscribe links (GDPR compliance)
> - Monitor bounce rates
> - Set up webhook for delivery tracking

### Rate Limiting

Mailtrap has sending limits based on your plan:
- Free: 1,000 emails/month
- Starter: 10,000 emails/month
- Business: 100,000+ emails/month

The email service includes a 100ms delay between bulk emails to avoid rate limiting.

---

## Email Analytics

Track email performance in Mailtrap Dashboard:
- **Delivery Rate** - % of emails successfully delivered
- **Open Rate** - % of emails opened (requires tracking pixel)
- **Click Rate** - % of clickable links
- **Bounce Rate** - % of failed deliveries
- **Spam Reports** - User spam complaints

---

## Alternative Email Providers

The email service can be adapted for:
- **SendGrid** - High-volume transactional emails
- **AWS SES** - Cost-effective, scalable
- **Mailgun** - Developer-friendly API
- **Postmark** - Transactional focused

To switch providers, modify [`src/config/email.ts`](file:///Users/mac/Documents/cmu/fall-25/compiled/application-gateway-typescript/src/config/email.ts) with the new provider's API.

---

## Summary

✅ **Installed:** Mailtrap SDK and nodemailer  
✅ **Configured:** Environment variables for API token  
✅ **Created:** Email service with HTML templates  
✅ **Integrated:** NotificationService sends actual emails  
✅ **Templates:** Package updates, version changes, discontinuations  

**Now subscribers receive beautiful HTML emails for all package activities!** 📧
