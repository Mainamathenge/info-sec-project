import nodemailer, { Transporter } from 'nodemailer';
import { MailtrapClient } from 'mailtrap';
import { config } from './env';

class EmailService {
    private mailtrapClient: MailtrapClient | null = null;

    constructor() {
        if (config.mailtrapToken) {
            this.mailtrapClient = new MailtrapClient({ token: config.mailtrapToken });
            console.log('✉️  Mailtrap email service initialized');
        } else {
            console.warn('⚠️  Mailtrap token not configured. Email notifications will be logged only.');
        }
    }

    /**
     * Send an email via Mailtrap
     */
    async sendEmail(to: string, subject: string, htmlContent: string, textContent?: string): Promise<boolean> {
        try {
            if (!this.mailtrapClient) {
                console.log(`📧 [Email Not Sent - No Config] To: ${to}, Subject: ${subject}`);
                return false;
            }

            const sender = {
                email: config.mailtrapSenderEmail,
                name: config.mailtrapSenderName,
            };

            await this.mailtrapClient.send({
                from: sender,
                to: [{ email: to }],
                subject: subject,
                html: htmlContent,
                text: textContent || this.stripHtml(htmlContent),
                category: 'Package Notification',
            });

            console.log(`✅ Email sent to ${to}: ${subject}`);
            return true;
        } catch (error: any) {
            console.error(`❌ Failed to send email to ${to}:`, error.message);
            return false;
        }
    }

    /**
     * Send bulk emails (with rate limiting)
     */
    async sendBulkEmails(emails: Array<{ to: string; subject: string; html: string; text?: string }>): Promise<void> {
        for (const email of emails) {
            await this.sendEmail(email.to, email.subject, email.html, email.text);
            // Small delay to avoid rate limiting
            await this.delay(100);
        }
    }

    /**
     * Strip HTML tags for plain text version
     */
    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Email template for package update
     */
    generatePackageUpdateEmail(packageId: string, version: string, packageName: string): { html: string; text: string } {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        .package-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 New Package Version Available</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>A new version of <strong>${packageName}</strong> has been published!</p>
            
            <div class="package-info">
                <p><strong>Package:</strong> ${packageId}</p>
                <p><strong>Version:</strong> ${version}</p>
            </div>
            
            <p>You're receiving this email because you're subscribed to updates for this package.</p>
            
            <p style="text-align: center; margin-top: 20px;">
                <a href="http://localhost:3000/packages/${packageId}/${version}" class="button">View Package</a>
            </p>
        </div>
        <div class="footer">
            <p>Package Management System</p>
            <p>To unsubscribe from updates for this package, visit your subscription settings.</p>
        </div>
    </div>
</body>
</html>
        `;

        const text = `
New Package Version Available

Package: ${packageId}
Version: ${version}
Name: ${packageName}

A new version has been published. Visit http://localhost:3000/packages/${packageId}/${version} to view details.

You're receiving this email because you're subscribed to updates for this package.
        `;

        return { html, text };
    }

    /**
     * Email template for version disabled
     */
    generateVersionDisabledEmail(packageId: string, version: string): { html: string; text: string } {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Package Version Disabled</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            
            <div class="warning">
                <p><strong>Package:</strong> ${packageId}</p>
                <p><strong>Version:</strong> ${version}</p>
                <p><strong>Status:</strong> DISABLED</p>
            </div>
            
            <p>This version has been disabled by the package administrators and is no longer available for download.</p>
            <p>Please update to a newer version if available.</p>
        </div>
        <div class="footer">
            <p>Package Management System</p>
        </div>
    </div>
</body>
</html>
        `;

        const text = `
Package Version Disabled

Package: ${packageId}
Version: ${version}
Status: DISABLED

This version has been disabled and is no longer available for download.
Please update to a newer version if available.
        `;

        return { html, text };
    }

    /**
     * Email template for package discontinued
     */
    generatePackageDiscontinuedEmail(packageId: string): { html: string; text: string } {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .critical { background: #ffebee; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚫 Package Discontinued</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            
            <div class="critical">
                <p><strong>Package:</strong> ${packageId}</p>
                <p><strong>Status:</strong> DISCONTINUED</p>
            </div>
            
            <p>This package has been permanently discontinued by the administrators.</p>
            <p>All versions are no longer available for download.</p>
            <p>Please consider migrating to an alternative package.</p>
        </div>
        <div class="footer">
            <p>Package Management System</p>
        </div>
    </div>
</body>
</html>
        `;

        const text = `
Package Discontinued

Package: ${packageId}
Status: DISCONTINUED

This package has been permanently discontinued. All versions are no longer available.
Please consider migrating to an alternative package.
        `;

        return { html, text };
    }
}

export const emailService = new EmailService();
