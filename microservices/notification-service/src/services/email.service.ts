/**
 * Email Service - Nodemailer implementation
 */

import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EmailNotification } from '../types';

let transporter: nodemailer.Transporter | null = null;

export async function initTransporter(): Promise<void> {
  if (config.smtp.user && config.smtp.password) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });

    try {
      await transporter.verify();
      logger.info('Email transporter verified');
    } catch (error: any) {
      logger.error('Email transporter verification failed', { error: error.message });
    }
  } else {
    logger.warn('Email SMTP not configured');
  }
}

export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  if (!transporter) {
    logger.warn('Email transporter not initialized');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"ShopHub" <${config.smtp.user}>`,
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
      text: notification.text || notification.html.replace(/<[^>]*>/g, ''),
    });

    logger.info('Email sent', { to: notification.to, subject: notification.subject });
    return true;
  } catch (error: any) {
    logger.error('Failed to send email', { to: notification.to, error: error.message });
    return false;
  }
}

export function generateOrderConfirmationEmail(data: {
  orderId: string;
  customerName: string;
  orderTotal: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}): EmailNotification {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>x${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return {
    to: '', // Will be set by caller
    subject: `Order Confirmed - #${data.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff5722;">Order Confirmed!</h1>
        <p>Hi ${data.customerName},</p>
        <p>Your order #${data.orderId} has been confirmed.</p>

        <h2>Order Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>$${data.orderTotal.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <p style="margin-top: 20px;">
          We'll notify you when your order ships. You can track your order status in your account.
        </p>

        <p style="margin-top: 30px; color: #666;">
          Thank you for shopping with ShopHub!
        </p>
      </div>
    `,
  };
}

export function generatePasswordResetEmail(resetToken: string): EmailNotification {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  return {
    to: '',
    subject: 'Password Reset Request - ShopHub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff5722;">Password Reset</h1>
        <p>You requested a password reset for your ShopHub account.</p>
        <p>Click the button below to reset your password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #ff5722; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };
}

export default {
  initTransporter,
  sendEmail,
  generateOrderConfirmationEmail,
  generatePasswordResetEmail,
};
