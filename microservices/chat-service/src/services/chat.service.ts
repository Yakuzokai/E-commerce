/**
 * Chat Service - Business Logic
 */

import { query, queryOne } from '../db';
import { Conversation, Message, CreateConversationRequest, SendMessageRequest, PaginatedResponse } from '../types';
import { publishEvent, CHAT_TOPICS } from './kafka.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new conversation
 */
export async function createConversation(data: CreateConversationRequest): Promise<Conversation> {
  const id = uuidv4();
  const unreadCount: Record<string, number> = {};
  data.participantIds.forEach(pid => {
    unreadCount[pid] = 0;
  });

  const conversation = await queryOne<any>(
    `INSERT INTO conversations (id, type, participants, order_id, product_id, unread_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, data.type, data.participantIds, data.orderId, data.productId, JSON.stringify(unreadCount)]
  );

  // Add participants
  for (const participantId of data.participantIds) {
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
      [id, participantId]
    );
  }

  // Send initial message if provided
  if (data.initialMessage) {
    await sendMessage({
      conversationId: id,
      type: 'text',
      content: data.initialMessage,
    }, data.participantIds[0], 'System');
  }

  logger.info('Conversation created', { conversationId: id, participants: data.participantIds });
  return conversation;
}

/**
 * Get conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  return queryOne<Conversation>(
    'SELECT * FROM conversations WHERE id = $1',
    [conversationId]
  );
}

/**
 * Get user's conversations
 */
export async function getUserConversations(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Conversation>> {
  const offset = (page - 1) * limit;

  const [conversations, countResult] = await Promise.all([
    query<any>(
      `SELECT c.*,
        (SELECT json_build_object(
          'id', m.id,
          'content', m.content,
          'senderId', m.sender_id,
          'senderName', m.sender_name,
          'createdAt', m.created_at
        ) FROM messages m WHERE m.id = c.last_message_id) as last_message
       FROM conversations c
       WHERE $1 = ANY(c.participants)
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM conversations WHERE $1 = ANY(participants)`,
      [userId]
    ),
  ]);

  const total = parseInt(countResult?.count || '0');

  // Format conversations with last message
  const formattedConversations = conversations.map(c => ({
    ...c,
    lastMessage: c.last_message,
    participants: c.participants,
    unreadCount: c.unread_count,
  }));

  return {
    data: formattedConversations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get or create conversation between users
 */
export async function getOrCreateDirectConversation(
  userId1: string,
  userId2: string
): Promise<Conversation> {
  // Check if conversation exists
  const existing = await queryOne<Conversation>(
    `SELECT * FROM conversations
     WHERE type = 'direct'
     AND participants = ARRAY[$1, $2]::UUID[]
     OR participants = ARRAY[$2, $1]::UUID[]`,
    [userId1, userId2]
  );

  if (existing) {
    return existing;
  }

  // Create new conversation
  return createConversation({
    type: 'direct',
    participantIds: [userId1, userId2],
  });
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string,
  page: number = 1,
  limit: number = 50,
  before?: Date
): Promise<PaginatedResponse<Message>> {
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE conversation_id = $1';
  const params: any[] = [conversationId];

  if (before) {
    whereClause += ' AND created_at < $2';
    params.push(before);
  }

  const [messages, countResult] = await Promise.all([
    query<Message>(
      `SELECT * FROM messages ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages ${whereClause}`,
      params
    ),
  ]);

  // Mark as read
  await markMessagesAsRead(conversationId, userId);

  const total = parseInt(countResult?.count || '0');

  return {
    data: messages.reverse(), // Return in chronological order
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Send a message
 */
export async function sendMessage(
  data: SendMessageRequest,
  senderId: string,
  senderName?: string,
  senderRole?: 'buyer' | 'seller' | 'system'
): Promise<Message> {
  const id = uuidv4();

  const message = await queryOne<Message>(
    `INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_role, type, content, attachment_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent')
     RETURNING *`,
    [id, data.conversationId, senderId, senderName, senderRole || 'buyer', data.type, data.content, data.attachmentUrl]
  );

  // Update conversation
  await query(
    `UPDATE conversations
     SET last_message_id = $1, last_message_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [id, data.conversationId]
  );

  // Update unread counts
  const conversation = await getConversationById(data.conversationId);
  if (conversation) {
    for (const participantId of conversation.participants) {
      if (participantId !== senderId) {
        await query(
          `UPDATE conversations
           SET unread_count = unread_count || jsonb_build_object($1, COALESCE((unread_count->>$1)::int, 0) + 1)
           WHERE id = $2`,
          [participantId, data.conversationId]
        );
      }
    }
  }

  // Publish event
  await publishEvent(CHAT_TOPICS.NEW_MESSAGE, {
    eventType: 'NEW_MESSAGE',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      message,
      conversationId: data.conversationId,
      receiverIds: conversation?.participants.filter(p => p !== senderId) || [],
    },
  });

  logger.info('Message sent', { messageId: id, conversationId: data.conversationId });
  return message!;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE messages
     SET read_by = array_distinct(array_append(read_by, $1))
     WHERE conversation_id = $2 AND NOT ($1 = ANY(read_by))`,
    [userId, conversationId]
  );

  await query(
    `UPDATE conversations
     SET unread_count = unread_count - $1
     WHERE id = $2`,
    [userId, conversationId]
  );

  await query(
    `UPDATE conversation_participants
     SET last_read_at = CURRENT_TIMESTAMP
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
}

/**
 * Get unread message count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await queryOne<any>(
    `SELECT SUM(value::int) as total
     FROM conversations, jsonb_each_text(unread_count)
     WHERE $1 = ANY(participants)`,
    [userId]
  );
  return parseInt(result?.total || '0');
}

/**
 * Delete message (soft delete - only sender can delete)
 */
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE messages
     SET content = '[deleted]', type = 'text'
     WHERE id = $1 AND sender_id = $2`,
    [messageId, userId]
  );
  return (result as any).rowCount > 0;
}

/**
 * Mute/unmute conversation
 */
export async function toggleMute(conversationId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE conversation_participants
     SET is_muted = NOT is_muted
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return (result as any).rowCount > 0;
}

/**
 * Block/unblock user
 */
export async function toggleBlock(conversationId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE conversation_participants
     SET is_blocked = NOT is_blocked
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return (result as any).rowCount > 0;
}

export default {
  createConversation,
  getConversationById,
  getUserConversations,
  getOrCreateDirectConversation,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  deleteMessage,
  toggleMute,
  toggleBlock,
};
