/**
 * Notification Service - Business Logic
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db';
import { Notification, CreateNotificationRequest, UserPreferences, PaginatedResponse, NotificationChannel } from '../types';
import { sendEmail } from './email.service';
import { publishEvent, NOTIFICATION_TOPICS } from './kafka.service';
import { logger } from '../utils/logger';

/**
 * Create a notification
 */
export async function createNotification(data: CreateNotificationRequest): Promise<Notification> {
  const id = uuidv4();
  const channels = data.channels || ['in_app'];

  const notification = await queryOne<any>(
    `INSERT INTO notifications (id, user_id, type, title, message, data, channels, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [id, data.userId, data.type, data.title, data.message, JSON.stringify(data.data || {}), channels]
  );

  // Send via channels
  await sendNotification(notification);

  logger.info('Notification created', { notificationId: id, userId: data.userId, type: data.type });
  return notification;
}

/**
 * Send notification through configured channels
 */
async function sendNotification(notification: any): Promise<void> {
  const channels = notification.channels || ['in_app'];

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'email':
          // In production, fetch user email and send
          await sendEmail({
            to: 'user@example.com', // Will be fetched from user service
            subject: notification.title,
            html: `<p>${notification.message}</p>`,
          });
          break;

        case 'push':
          await publishEvent(NOTIFICATION_TOPICS.PUSH_NOTIFICATION, {
            eventType: 'PUSH_NOTIFICATION',
            eventId: uuidv4(),
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
              notificationId: notification.id,
              userId: notification.user_id,
              title: notification.title,
              message: notification.message,
              data: notification.data,
            },
          });
          break;

        case 'sms':
          await publishEvent(NOTIFICATION_TOPICS.SMS_NOTIFICATION, {
            eventType: 'SMS_NOTIFICATION',
            eventId: uuidv4(),
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
              notificationId: notification.id,
              userId: notification.user_id,
              message: notification.message,
            },
          });
          break;

        case 'in_app':
        default:
          // Already stored in database
          break;
      }

      // Log successful send
      await query(
        `INSERT INTO notification_logs (notification_id, channel, status)
         VALUES ($1, $2, 'sent')`,
        [notification.id, channel]
      );

      // Update notification status
      await query(
        `UPDATE notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [notification.id]
      );

    } catch (error: any) {
      logger.error('Failed to send notification via channel', {
        notificationId: notification.id,
        channel,
        error: error.message,
      });

      await query(
        `INSERT INTO notification_logs (notification_id, channel, status, error_message)
         VALUES ($1, $2, 'failed', $3)`,
        [notification.id, channel, error.message]
      );
    }
  }
}

/**
 * Get notification by ID
 */
export async function getNotificationById(id: string): Promise<Notification | null> {
  return queryOne<Notification>('SELECT * FROM notifications WHERE id = $1', [id]);
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<PaginatedResponse<Notification>> {
  const offset = (page - 1) * limit;
  const whereClause = unreadOnly
    ? 'WHERE user_id = $1 AND status != \'read\''
    : 'WHERE user_id = $1';

  const [notifications, countResult] = await Promise.all([
    query<Notification>(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
      [userId]
    ),
  ]);

  const total = parseInt(countResult?.count || '0');

  return {
    data: notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
  const notification = await queryOne<Notification>(
    `UPDATE notifications
     SET status = 'read', read_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );

  if (notification) {
    await publishEvent(NOTIFICATION_TOPICS.NOTIFICATION_READ, {
      eventType: 'NOTIFICATION_READ',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: { notificationId, userId },
    });
  }

  return notification;
}

/**
 * Mark all notifications as read for user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications
     SET status = 'read', read_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND status != 'read'`,
    [userId]
  );

  logger.info('All notifications marked as read', { userId });
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND status != 'read'`,
    [userId]
  );
  return parseInt(result?.count || '0');
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return (result as any).rowCount > 0;
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  return queryOne<UserPreferences>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(preferences)) {
    if (key !== 'userId' && value !== undefined) {
      fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const result = await queryOne<UserPreferences>(
    `INSERT INTO user_preferences (user_id, ${fields.map(f => f.split(' =')[0]).join(', ')})
     VALUES ($${paramIndex}, ${fields.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (user_id) DO UPDATE
     SET ${fields.join(', ')}
     RETURNING *`,
    [...values.slice(0, -1), values[values.length - 1]]
  );

  return result!;
}

/**
 * Send bulk notifications
 */
export async function sendBulkNotifications(
  userIds: string[],
  notificationData: Omit<CreateNotificationRequest, 'userId'>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      await createNotification({ ...notificationData, userId });
      sent++;
    } catch (error) {
      logger.error('Failed to send bulk notification', { userId, error });
      failed++;
    }
  }

  logger.info('Bulk notification completed', { sent, failed, total: userIds.length });
  return { sent, failed };
}

export default {
  createNotification,
  getNotificationById,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  getUserPreferences,
  updateUserPreferences,
  sendBulkNotifications,
};
