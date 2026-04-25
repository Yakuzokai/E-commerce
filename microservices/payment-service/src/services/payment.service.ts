/**
 * Payment Service - Business Logic
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../db';
import { Payment, PaymentStatus, PaymentMethod, Currency, CreatePaymentRequest, Refund, CreateRefundRequest, PaginatedResponse } from '../types';
import { publishEvent, PAYMENT_TOPICS } from './kafka.service';
import { logger } from '../utils/logger';

/**
 * Create a new payment
 */
export async function createPayment(data: CreatePaymentRequest): Promise<Payment> {
  const id = uuidv4();

  const payment = await queryOne<any>(
    `INSERT INTO payments (id, order_id, user_id, amount, currency, method, status, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
     RETURNING *`,
    [id, data.orderId, data.userId, data.amount, data.currency, data.method, data.description, JSON.stringify(data.metadata || {})]
  );

  // Publish payment created event
  await publishEvent(PAYMENT_TOPICS.PAYMENT_CREATED, {
    eventType: 'PAYMENT_CREATED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: payment,
  });

  logger.info('Payment created', { paymentId: id, orderId: data.orderId });
  return payment;
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  return queryOne<Payment>(
    'SELECT * FROM payments WHERE id = $1',
    [paymentId]
  );
}

/**
 * Get payment by order ID
 */
export async function getPaymentByOrderId(orderId: string): Promise<Payment | null> {
  return queryOne<Payment>(
    'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
    [orderId]
  );
}

/**
 * Get payments by user
 */
export async function getPaymentsByUser(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Payment>> {
  const offset = (page - 1) * limit;

  const [payments, countResult] = await Promise.all([
    query<Payment>(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    ),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM payments WHERE user_id = $1', [userId]),
  ]);

  const total = parseInt(countResult?.count || '0');

  return {
    data: payments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Process payment (simulate payment gateway)
 */
export async function processPayment(paymentId: string): Promise<Payment | null> {
  const payment = await getPaymentById(paymentId);
  if (!payment) return null;

  if (payment.status !== 'pending') {
    throw new Error(`Payment ${paymentId} is not in pending status`);
  }

  // Update status to processing
  await query(
    `UPDATE payments SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [paymentId]
  );

  // Simulate payment gateway processing
  try {
    // In production, this would call Stripe/PayPal API
    const providerTransactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update to completed
    const updatedPayment = await queryOne<Payment>(
      `UPDATE payments
       SET status = 'completed',
           provider_transaction_id = $1,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [providerTransactionId, paymentId]
    );

    // Log transaction
    await query(
      `INSERT INTO transactions (payment_id, type, amount, currency, status, provider_response)
       VALUES ($1, 'charge', $2, $3, 'success', $4)`,
      [paymentId, payment.amount, payment.currency, JSON.stringify({ transactionId: providerTransactionId })]
    );

    // Publish events
    await publishEvent(PAYMENT_TOPICS.PAYMENT_COMPLETED, {
      eventType: 'PAYMENT_COMPLETED',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: { paymentId, orderId: payment.orderId, amount: payment.amount },
    });

    await publishEvent(PAYMENT_TOPICS.NOTIFICATION_PAYMENT, {
      eventType: 'NOTIFICATION_PAYMENT',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: { userId: payment.userId, orderId: payment.orderId, status: 'completed' },
    });

    logger.info('Payment processed successfully', { paymentId, orderId: payment.orderId });
    return updatedPayment;

  } catch (error: any) {
    // Payment failed
    await query(
      `UPDATE payments SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [paymentId]
    );

    await query(
      `INSERT INTO transactions (payment_id, type, amount, currency, status, error_message)
       VALUES ($1, 'charge', $2, $3, 'failed', $4)`,
      [paymentId, payment.amount, payment.currency, error.message]
    );

    await publishEvent(PAYMENT_TOPICS.PAYMENT_FAILED, {
      eventType: 'PAYMENT_FAILED',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: { paymentId, orderId: payment.orderId, error: error.message },
    });

    logger.error('Payment processing failed', { paymentId, error: error.message });
    throw error;
  }
}

/**
 * Create refund
 */
export async function createRefund(data: CreateRefundRequest): Promise<Refund> {
  const payment = await getPaymentById(data.paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }

  const refundAmount = data.amount || payment.amount;
  if (refundAmount > payment.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }

  const id = uuidv4();

  const refund = await queryOne<Refund>(
    `INSERT INTO refunds (id, payment_id, order_id, amount, reason, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [id, data.paymentId, payment.orderId, refundAmount, data.reason]
  );

  // Update payment status
  await query(
    `UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [data.paymentId]
  );

  // Publish event
  await publishEvent(PAYMENT_TOPICS.REFUND_CREATED, {
    eventType: 'REFUND_CREATED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: refund,
  });

  logger.info('Refund created', { refundId: id, paymentId: data.paymentId });
  return refund;
}

/**
 * Get refunds by payment
 */
export async function getRefundsByPayment(paymentId: string): Promise<Refund[]> {
  return query<Refund>(
    'SELECT * FROM refunds WHERE payment_id = $1 ORDER BY created_at DESC',
    [paymentId]
  );
}

/**
 * Get refund by ID
 */
export async function getRefundById(refundId: string): Promise<Refund | null> {
  return queryOne<Refund>(
    'SELECT * FROM refunds WHERE id = $1',
    [refundId]
  );
}

/**
 * Process refund (simulate)
 */
export async function processRefund(refundId: string): Promise<Refund | null> {
  const refund = await getRefundById(refundId);
  if (!refund) return null;

  if (refund.status !== 'pending') {
    throw new Error(`Refund ${refundId} is not in pending status`);
  }

  // Update to processing
  await query(
    `UPDATE refunds SET status = 'processing' WHERE id = $1`,
    [refundId]
  );

  try {
    // Simulate refund processing
    const providerRefundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update to completed
    const updatedRefund = await queryOne<Refund>(
      `UPDATE refunds
       SET status = 'completed',
           provider_refund_id = $1,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [providerRefundId, refundId]
    );

    // Log transaction
    await query(
      `INSERT INTO transactions (payment_id, type, amount, currency, status, provider_response)
       VALUES ($1, 'refund', $2, $3, 'success', $4)`,
      [refund.paymentId, refund.amount, 'USD', JSON.stringify({ refundId: providerRefundId })]
    );

    // Publish event
    await publishEvent(PAYMENT_TOPICS.REFUND_COMPLETED, {
      eventType: 'REFUND_COMPLETED',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: { refundId, paymentId: refund.paymentId, amount: refund.amount },
    });

    logger.info('Refund processed', { refundId });
    return updatedRefund;

  } catch (error: any) {
    await query(
      `UPDATE refunds SET status = 'failed' WHERE id = $1`,
      [refundId]
    );
    throw error;
  }
}

export default {
  createPayment,
  getPaymentById,
  getPaymentByOrderId,
  getPaymentsByUser,
  processPayment,
  createRefund,
  getRefundsByPayment,
  getRefundById,
  processRefund,
};
