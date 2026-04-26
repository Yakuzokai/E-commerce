/**
 * Order Service - Core business logic
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db';
import {
  Order,
  OrderItem,
  OrderWithItems,
  OrderStatus,
  CreateOrderRequest,
  Address,
  PaginatedResponse,
} from '../types';
import { publishEvent } from '../services/kafka.service';
import { logger } from '../utils/logger';

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create a new order
 */
export async function createOrder(
  userId: string,
  data: any // Using any here to allow flexible fields from frontend for now
): Promise<OrderWithItems> {
  return await transaction(async (client) => {
    const orderId = uuidv4();
    const orderNumber = generateOrderNumber();

    const subtotal = parseFloat(data.subtotal || 0);
    const shippingFee = parseFloat(data.shippingFee || 0);
    const taxAmount = subtotal * 0.08;
    const discountAmount = 0;
    const totalAmount = subtotal + shippingFee + taxAmount - discountAmount;

    // Create order
    const orderResult = await client.query<Order>(
      `INSERT INTO orders (
        id, order_number, user_id, seller_id, subtotal, discount_amount,
        shipping_fee, tax_amount, total_amount, payment_method, payment_status,
        shipping_address, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        orderId, orderNumber, userId, data.items[0]?.sellerId || uuidv4(), 
        subtotal, discountAmount, shippingFee, taxAmount, totalAmount, 
        data.paymentMethod, 'pending', JSON.stringify(data.shippingAddress), 'pending'
      ]
    );

    const order = orderResult.rows[0];

    // Create order items
    const items: OrderItem[] = [];
    for (const item of data.items) {
      const itemId = uuidv4();
      const itemResult = await client.query<OrderItem>(
        `INSERT INTO order_items (
          id, order_id, product_id, variant_id, seller_id, product_name,
          quantity, unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          itemId, orderId, item.productId, item.variantId, item.sellerId || uuidv4(),
          item.name || 'Product', item.quantity, parseFloat(item.price), 
          parseFloat(item.price) * item.quantity
        ]
      );
      items.push(itemResult.rows[0]);
    }

    // Create status history
    await client.query(
      `INSERT INTO order_status_history (id, order_id, status, description, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), orderId, 'pending', 'Order created', userId]
    );

    // Publish event
    await publishEvent('orders.created', {
      eventId: uuidv4(),
      eventType: 'ORDER_CREATED',
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        sellerId: order.sellerId,
        items,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
      },
    });

    logger.info('Order created', { orderId, orderNumber, userId });

    return {
      ...order,
      items,
      shipments: [],
    };
  });
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  const orderResult = await query<Order>(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );

  if (orderResult.rows.length === 0) return null;

  const order = orderResult.rows[0];

  // Get items
  const itemsResult = await query<OrderItem>(
    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
    [orderId]
  );

  // Get shipments
  const shipmentsResult = await query(
    'SELECT * FROM order_shipments WHERE order_id = $1',
    [orderId]
  );

  return {
    ...order,
    items: itemsResult.rows,
    shipments: shipmentsResult.rows,
  };
}

/**
 * Get order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const result = await query<Order>(
    'SELECT id FROM orders WHERE order_number = $1',
    [orderNumber]
  );

  if (result.rows.length === 0) return null;
  return getOrderById(result.rows[0].id);
}

/**
 * Get orders for a user
 */
export async function getOrdersByUser(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Order>> {
  const offset = (page - 1) * limit;

  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM orders WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query<Order>(
    `SELECT * FROM orders WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Get orders for a seller
 */
export async function getOrdersBySeller(
  sellerId: string,
  page: number = 1,
  limit: number = 20,
  status?: OrderStatus
): Promise<PaginatedResponse<Order>> {
  const offset = (page - 1) * limit;
  const conditions = ['seller_id = $1'];
  const values: any[] = [sellerId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM orders ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  values.push(limit, offset);
  const result = await query<Order>(
    `SELECT * FROM orders ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    values
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  description?: string,
  changedBy?: string
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const oldStatus = order.status;

  const updates: string[] = ['status = $1', 'updated_at = NOW()'];
  const values: any[] = [newStatus];
  let paramIndex = 2;

  // Set timestamps based on status
  if (newStatus === 'shipped') {
    updates.push('shipped_at = NOW()');
  } else if (newStatus === 'delivered') {
    updates.push('delivered_at = NOW()', 'completed_at = NOW()');
  } else if (newStatus === 'cancelled') {
    updates.push('cancelled_at = NOW()');
  }

  values.push(orderId);
  paramIndex++;

  const result = await query<Order>(
    `UPDATE orders SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;

  // Add to status history
  await query(
    `INSERT INTO order_status_history (id, order_id, status, description, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), orderId, newStatus, description || `Status changed to ${newStatus}`, changedBy]
  );

  // Publish event
  await publishEvent('orders.status_changed', {
    eventId: uuidv4(),
    eventType: 'ORDER_STATUS_CHANGED',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      orderId,
      orderNumber: order.orderNumber,
      oldStatus,
      newStatus,
      userId: order.userId,
    },
  });

  logger.info('Order status updated', { orderId, oldStatus, newStatus });

  return result.rows[0];
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: 'paid' | 'failed' | 'refunded'
): Promise<Order | null> {
  const result = await query<Order>(
    `UPDATE orders SET payment_status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [paymentStatus, orderId]
  );

  if (result.rows.length === 0) return null;

  // If payment succeeded, move to processing
  if (paymentStatus === 'paid') {
    await updateOrderStatus(orderId, 'processing', 'Payment received');
  }

  return result.rows[0];
}

/**
 * Cancel order
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  userId: string
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order) return null;

  // Can only cancel pending or processing orders
  if (!['pending', 'processing'].includes(order.status)) {
    throw new Error('Cannot cancel order in current status');
  }

  // Update status
  const result = await query<Order>(
    `UPDATE orders SET
       status = 'cancelled',
       cancelled_at = NOW(),
       cancellation_reason = $1,
       updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [reason, orderId]
  );

  if (result.rows.length === 0) return null;

  // Add to status history
  await query(
    `INSERT INTO order_status_history (id, order_id, status, description, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), orderId, 'cancelled', reason, userId]
  );

  // Publish event
  await publishEvent('orders.status_changed', {
    eventId: uuidv4(),
    eventType: 'ORDER_STATUS_CHANGED',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      orderId,
      orderNumber: order.orderNumber,
      oldStatus: order.status,
      newStatus: 'cancelled',
      userId: order.userId,
    },
  });

  logger.info('Order cancelled', { orderId, reason, userId });

  return result.rows[0];
}

/**
 * Create return request
 */
export async function createReturn(
  orderId: string,
  reason: string,
  description?: string
): Promise<any> {
  const returnId = uuidv4();

  const result = await query(
    `INSERT INTO returns (id, order_id, reason, description, status)
     VALUES ($1, $2, $3, $4, 'requested')
     RETURNING *`,
    [returnId, orderId, reason, description]
  );

  logger.info('Return created', { returnId, orderId });

  return result.rows[0];
}

/**
 * Get order statistics
 */
export async function getOrderStats(sellerId: string): Promise<any> {
  const stats = await query(`
    SELECT
      status,
      COUNT(*) as count,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_order_value
    FROM orders
    WHERE seller_id = $1
    GROUP BY status
  `, [sellerId]);

  const totalOrders = await query(
    'SELECT COUNT(*) as count FROM orders WHERE seller_id = $1',
    [sellerId]
  );

  return {
    byStatus: stats.rows,
    totalOrders: parseInt(totalOrders.rows[0].count),
  };
}

export default {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getOrdersByUser,
  getOrdersBySeller,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  createReturn,
  getOrderStats,
};
