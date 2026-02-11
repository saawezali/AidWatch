import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface CrisisAlertData {
  crisisTitle: string;
  crisisType: string;
  severity: string;
  location: string;
  description: string;
  crisisId: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string;
  private appUrl: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'alerts@aidwatch.org';
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      // Use environment variables for SMTP config
      // For development, use Ethereal or similar service
      if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // Development: create a test account or use console logging
        console.log('[EmailService] No SMTP configured, emails will be logged to console');
        this.transporter = nodemailer.createTransport({
          jsonTransport: true, // Returns the email as JSON instead of sending
        });
      }
    }
    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const transporter = this.getTransporter();
      
      const info = await transporter.sendMail({
        from: `"AidWatch Alerts" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      // In development with jsonTransport, log the email
      if (process.env.SMTP_HOST === undefined) {
        console.log('[EmailService] Email would be sent:', {
          to: options.to,
          subject: options.subject,
        });
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
    const verifyUrl = `${this.appUrl}/verify-subscription?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Subscription</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 28px;">🌍</span>
                </div>
                <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">AidWatch</h1>
                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Crisis Early Warning System</p>
              </div>
              
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px; font-weight: 600;">Verify Your Email</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                ${name ? `Hi ${name},` : 'Hi there,'}<br><br>
                Thank you for subscribing to AidWatch crisis alerts. Please verify your email address to start receiving notifications.
              </p>
              
              <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
                Verify Email Address
              </a>
              
              <p style="margin: 24px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                If you didn't subscribe to AidWatch alerts, you can safely ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                © 2026 AidWatch. Humanitarian Crisis Monitoring.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: 'Verify your AidWatch subscription',
      html,
    });

    return result.success;
  }

  async sendCrisisAlert(
    email: string,
    crisis: CrisisAlertData,
    unsubscribeToken: string,
    subscriberName?: string
  ): Promise<boolean> {
    const crisisUrl = `${this.appUrl}/crises/${crisis.crisisId}`;
    const unsubscribeUrl = `${this.appUrl}/unsubscribe?token=${unsubscribeToken}`;
    
    const severityColors: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#16a34a',
      UNKNOWN: '#6b7280',
    };
    
    const severityColor = severityColors[crisis.severity] || '#6b7280';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Crisis Alert: ${crisis.crisisTitle}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header with severity indicator -->
              <div style="background: linear-gradient(135deg, ${severityColor}, ${severityColor}dd); padding: 24px 40px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                    ${crisis.severity} Severity
                  </span>
                </div>
                <h1 style="margin: 16px 0 0; color: white; font-size: 24px; font-weight: 700; line-height: 1.3;">
                  ⚠️ ${crisis.crisisTitle}
                </h1>
              </div>
              
              <div style="padding: 32px 40px;">
                <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                  <div>
                    <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Type</p>
                    <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">${crisis.crisisType.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Location</p>
                    <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">📍 ${crisis.location}</p>
                  </div>
                </div>
                
                <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.7;">
                  ${crisis.description}
                </p>
                
                <a href="${crisisUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Full Details →
                </a>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                
                <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                  You're receiving this alert because you subscribed to crisis notifications for this region.<br>
                  <a href="${unsubscribeUrl}" style="color: #64748b;">Unsubscribe</a> | 
                  <a href="${this.appUrl}/manage-subscription?token=${unsubscribeToken}" style="color: #64748b;">Manage preferences</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: `⚠️ Crisis Alert: ${crisis.crisisTitle} - ${crisis.location}`,
      html,
    });

    return result.success;
  }

  async sendDailyDigest(
    email: string,
    crises: CrisisAlertData[],
    unsubscribeToken: string,
    subscriberName?: string
  ): Promise<boolean> {
    const unsubscribeUrl = `${this.appUrl}/unsubscribe?token=${unsubscribeToken}`;
    
    const crisisListHtml = crises.map(crisis => `
      <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="background: ${crisis.severity === 'CRITICAL' ? '#fef2f2' : crisis.severity === 'HIGH' ? '#fff7ed' : '#fefce8'}; color: ${crisis.severity === 'CRITICAL' ? '#dc2626' : crisis.severity === 'HIGH' ? '#ea580c' : '#ca8a04'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
            ${crisis.severity}
          </span>
          <span style="color: #64748b; font-size: 12px;">${crisis.crisisType.replace(/_/g, ' ')}</span>
        </div>
        <h3 style="margin: 0 0 8px; color: #1e293b; font-size: 16px;">
          <a href="${this.appUrl}/crises/${crisis.crisisId}" style="color: #1e293b; text-decoration: none;">${crisis.crisisTitle}</a>
        </h3>
        <p style="margin: 0; color: #64748b; font-size: 13px;">📍 ${crisis.location}</p>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AidWatch Daily Digest</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">📊 Daily Crisis Digest</h1>
                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                ${subscriberName ? `Hi ${subscriberName},` : 'Hi,'}<br>
                Here's your daily summary of ${crises.length} crisis${crises.length === 1 ? '' : 'es'} in your monitored regions.
              </p>
              
              ${crisisListHtml}
              
              <a href="${this.appUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 24px;">
                View All Crises
              </a>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #64748b;">Unsubscribe</a> | 
                <a href="${this.appUrl}/manage-subscription?token=${unsubscribeToken}" style="color: #64748b;">Manage preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: `📊 AidWatch Daily Digest - ${crises.length} Crisis Update${crises.length === 1 ? '' : 's'}`,
      html,
    });

    return result.success;
  }
}

export const emailService = new EmailService();
