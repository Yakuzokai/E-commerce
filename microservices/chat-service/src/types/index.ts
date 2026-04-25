export type ConversationType = 'direct' | 'order' | 'product';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  orderId?: string;
  productId?: string;
  lastMessage?: Message;
  lastMessageAt?: Date;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: 'buyer' | 'seller' | 'system';
  type: MessageType;
  content: string;
  attachmentUrl?: string;
  status: MessageStatus;
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationRequest {
  type: ConversationType;
  participantIds: string[];
  orderId?: string;
  productId?: string;
  initialMessage?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  type: MessageType;
  content: string;
  attachmentUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}
