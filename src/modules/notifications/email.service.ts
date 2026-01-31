import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly smtpEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    this.smtpEnabled = !!(host && user && pass);

    if (this.smtpEnabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP configured successfully');
    } else {
      this.logger.warn('SMTP is not configured - emails will be logged only');
    }
  }

  /**
   * Send email using template
   */
  async sendTemplate(
    userId: string | null,
    email: string,
    template: string,
    templateData: Record<string, any>,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ): Promise<boolean> {
    const subject = this.getSubjectForTemplate(template, templateData);
    const html = this.renderTemplate(template, templateData);

    try {
      if (this.smtpEnabled && this.transporter) {
        await this.transporter.sendMail({
          from: this.configService.get('SMTP_FROM', 'noreply@kumele.com'),
          to: email,
          subject,
          html,
        });
      } else {
        this.logger.debug(`[Mock Email] To: ${email}, Subject: ${subject}`);
      }

      // Log successful delivery
      await this.prisma.emailDeliveryLog.create({
        data: {
          userId,
          email,
          template,
          relatedEntityType,
          relatedEntityId,
          status: 'sent',
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Email send failed: ${error.message}`);

      // Log failed delivery
      await this.prisma.emailDeliveryLog.create({
        data: {
          userId,
          email,
          template,
          relatedEntityType,
          relatedEntityId,
          status: 'failed',
          errorMessage: error.message,
        },
      });

      return false;
    }
  }

  /**
   * Send raw email
   */
  async send(options: EmailOptions): Promise<boolean> {
    try {
      if (this.smtpEnabled && this.transporter) {
        await this.transporter.sendMail({
          from: this.configService.get('SMTP_FROM', 'noreply@kumele.com'),
          ...options,
        });
      } else {
        this.logger.debug(`[Mock Email] To: ${options.to}, Subject: ${options.subject}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Email send failed: ${error.message}`);
      return false;
    }
  }

  private getSubjectForTemplate(template: string, data: Record<string, any>): string {
    const subjects: Record<string, string> = {
      event_cancelled: `Event Cancelled: ${data.eventTitle || 'Your event'}`,
      payment_expired: 'Payment Window Expired - Kumele',
      welcome: 'Welcome to Kumele!',
      birthday: 'Happy Birthday from Kumele! 🎉',
      event_reminder: `Reminder: ${data.eventTitle || 'Your event'} is starting soon`,
      support_ticket: `Support Ticket Received: ${data.ticketId || ''}`,
    };
    return subjects[template] || 'Notification from Kumele';
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering - in production, use Handlebars or similar
    const templates: Record<string, string> = {
      event_cancelled: `
        <h2>Event Cancelled</h2>
        <p>We're sorry to inform you that the event "${data.eventTitle}" has been cancelled.</p>
        ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
        <p>If you made a payment, it will be refunded automatically.</p>
      `,
      payment_expired: `
        <h2>Payment Window Expired</h2>
        <p>Your reservation for "${data.eventTitle}" has expired because the payment was not completed in time.</p>
        <p>If you're still interested, please try joining the event again.</p>
      `,
      welcome: `
        <h2>Welcome to Kumele! 🎉</h2>
        <p>Hi ${data.name || 'there'},</p>
        <p>We're excited to have you on board. Start exploring hobbies and events near you!</p>
      `,
      support_ticket: `
        <h2>Support Ticket Received</h2>
        <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>From:</strong> ${data.userEmail || 'Anonymous'}</p>
        <hr/>
        <p>${data.message}</p>
      `,
    };

    return templates[template] || `<p>${JSON.stringify(data)}</p>`;
  }
}
