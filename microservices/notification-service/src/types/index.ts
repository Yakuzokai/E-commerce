export type NotificationType =
  | 'order_placed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'refund_processed'
  | 'return_initiated'
  | 'return_approved'
  | 'return_rejected'
  | 'review_reminder'
  | 'flash_sale'
  | 'promotion'
  | 'account_security'
  | 'chat_message';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  status: NotificationStatus;
  readAt?: Date;
  createdAt: Date;
  sentAt?: Date;
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PushNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface SMSNotification {
  to: string;
  message: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}

export interface UserPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  preferences: Record<NotificationType, boolean>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
