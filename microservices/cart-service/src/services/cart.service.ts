/**
 * Cart Service - Redis-based shopping cart
 */

import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Cart, CartItem, AddToCartRequest, CartSummary, AppliedVoucher } from '../types';
import { publishEvent, CART_TOPICS } from './kafka.service';

let client: RedisClientType | null = null;
const CART_PREFIX = 'cart:';

async function connectRedis(): Promise<void> {
  client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis max retries reached');
          return new Error('Redis max retries reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('error', (err) => logger.error('Redis error', { error: err.message }));
  client.on('connect', () => logger.info('Redis connected'));

  await client.connect();
}

async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

function getCartKey(userId: string): string {
  return `${CART_PREFIX}${userId}`;
}

function calculateCartTotals(items: CartItem[], vouchers: AppliedVoucher[] = []): {
  subtotal: number;
  totalDiscount: number;
  totalPrice: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const originalTotal = items.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0
  );

  let totalDiscount = 0;

  for (const voucher of vouchers) {
    if (voucher.type === 'percentage') {
      const discount = Math.min(
        subtotal * (voucher.value / 100),
        voucher.maxDiscount || Infinity
      );
      totalDiscount += discount;
    } else if (voucher.type === 'fixed') {
      totalDiscount += voucher.value;
    }
  }

  // Don't allow discount to exceed subtotal
  totalDiscount = Math.min(totalDiscount, subtotal);

  return {
    subtotal,
    totalDiscount,
    totalPrice: subtotal - totalDiscount,
  };
}

/**
 * Get user's cart
 */
export async function getCart(userId: string): Promise<Cart> {
  if (!client) throw new Error('Redis not connected');

  const key = getCartKey(userId);
  const data = await client.get(key);

  if (data) {
    return JSON.parse(data);
  }

  // Create empty cart
  return createEmptyCart(userId);
}

/**
 * Create empty cart
 */
function createEmptyCart(userId: string): Cart {
  return {
    id: uuidv4(),
    userId,
    items: [],
    totalItems: 0,
    subtotal: 0,
    totalDiscount: 0,
    totalPrice: 0,
    appliedVouchers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Add item to cart
 */
export async function addToCart(userId: string, item: AddToCartRequest): Promise<Cart> {
  if (!client) throw new Error('Redis not connected');

  let cart = await getCart(userId);

  // Check max items limit
  if (cart.items.length >= config.cart.maxItems) {
    throw new Error('Cart is full');
  }

  // Check if item already exists
  const existingIndex = cart.items.findIndex(
    (i) => i.productId === item.productId && i.variantId === item.variantId
  );

  if (existingIndex >= 0) {
    // Update quantity
    const newQuantity = Math.min(
      cart.items[existingIndex].quantity + item.quantity,
      config.cart.maxQuantity
    );
    cart.items[existingIndex].quantity = newQuantity;
  } else {
    // Add new item
    const cartItem: CartItem = {
      id: uuidv4(),
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.min(item.quantity, config.cart.maxQuantity),
      price: item.price,
      originalPrice: item.originalPrice,
      name: item.name,
      image: item.image,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      variantName: item.variantName,
      addedAt: new Date(),
    };
    cart.items.push(cartItem);
  }

  // Recalculate totals
  const totals = calculateCartTotals(cart.items, cart.appliedVouchers);
  cart.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  cart.subtotal = totals.subtotal;
  cart.totalDiscount = totals.totalDiscount;
  cart.totalPrice = totals.totalPrice;
  cart.updatedAt = new Date();

  // Save to Redis
  const key = getCartKey(userId);
  await client.setEx(key, config.cart.ttl, JSON.stringify(cart));

  // Publish event
  await publishEvent(CART_TOPICS.CART_UPDATED, {
    eventType: 'CART_UPDATED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { userId, action: 'add', item },
  });

  logger.info('Item added to cart', { userId, productId: item.productId });
  return cart;
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number
): Promise<Cart> {
  if (!client) throw new Error('Redis not connected');

  const cart = await getCart(userId);
  const itemIndex = cart.items.findIndex((i) => i.id === itemId);

  if (itemIndex < 0) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = Math.min(quantity, config.cart.maxQuantity);
  }

  // Recalculate totals
  const totals = calculateCartTotals(cart.items, cart.appliedVouchers);
  cart.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  cart.subtotal = totals.subtotal;
  cart.totalDiscount = totals.totalDiscount;
  cart.totalPrice = totals.totalPrice;
  cart.updatedAt = new Date();

  // Save to Redis
  const key = getCartKey(userId);
  await client.setEx(key, config.cart.ttl, JSON.stringify(cart));

  logger.info('Cart item updated', { userId, itemId, quantity });
  return cart;
}

/**
 * Remove item from cart
 */
export async function removeFromCart(userId: string, itemId: string): Promise<Cart> {
  return updateCartItem(userId, itemId, 0);
}

/**
 * Clear cart
 */
export async function clearCart(userId: string): Promise<void> {
  if (!client) throw new Error('Redis not connected');

  const key = getCartKey(userId);
  await client.del(key);

  await publishEvent(CART_TOPICS.CART_CLEARED, {
    eventType: 'CART_CLEARED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { userId },
  });

  logger.info('Cart cleared', { userId });
}

/**
 * Apply voucher to cart
 */
export async function applyVoucher(
  userId: string,
  voucher: AppliedVoucher
): Promise<Cart> {
  if (!client) throw new Error('Redis not connected');

  const cart = await getCart(userId);

  // Check minimum order amount
  if (voucher.minOrderAmount && cart.subtotal < voucher.minOrderAmount) {
    throw new Error(`Minimum order amount is ${voucher.minOrderAmount}`);
  }

  // Check if voucher already applied
  if (cart.appliedVouchers.find((v) => v.code === voucher.code)) {
    throw new Error('Voucher already applied');
  }

  cart.appliedVouchers.push(voucher);

  // Recalculate totals
  const totals = calculateCartTotals(cart.items, cart.appliedVouchers);
  cart.totalDiscount = totals.totalDiscount;
  cart.totalPrice = totals.totalPrice;
  cart.updatedAt = new Date();

  // Save to Redis
  const key = getCartKey(userId);
  await client.setEx(key, config.cart.ttl, JSON.stringify(cart));

  logger.info('Voucher applied', { userId, voucherCode: voucher.code });
  return cart;
}

/**
 * Remove voucher from cart
 */
export async function removeVoucher(userId: string, voucherCode: string): Promise<Cart> {
  if (!client) throw new Error('Redis not connected');

  const cart = await getCart(userId);

  cart.appliedVouchers = cart.appliedVouchers.filter((v) => v.code !== voucherCode);

  // Recalculate totals
  const totals = calculateCartTotals(cart.items, cart.appliedVouchers);
  cart.totalDiscount = totals.totalDiscount;
  cart.totalPrice = totals.totalPrice;
  cart.updatedAt = new Date();

  // Save to Redis
  const key = getCartKey(userId);
  await client.setEx(key, config.cart.ttl, JSON.stringify(cart));

  logger.info('Voucher removed', { userId, voucherCode });
  return cart;
}

/**
 * Get cart summary with shipping calculation
 */
export async function getCartSummary(userId: string, shippingFee: number = 5.99): Promise<CartSummary> {
  const cart = await getCart(userId);

  const originalTotal = cart.items.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0
  );

  return {
    items: cart.items,
    totalItems: cart.totalItems,
    subtotal: cart.subtotal,
    discount: cart.totalDiscount,
    shippingFee,
    total: cart.totalPrice + shippingFee,
    savings: originalTotal - cart.subtotal + cart.totalDiscount,
  };
}

/**
 * Merge guest cart with user cart
 */
export async function mergeGuestCart(
  userId: string,
  guestCartId: string,
  guestItems: CartItem[]
): Promise<Cart> {
  if (!client) throw new Error('Redis not connected');

  let userCart = await getCart(userId);

  for (const guestItem of guestItems) {
    const existingIndex = userCart.items.findIndex(
      (i) => i.productId === guestItem.productId && i.variantId === guestItem.variantId
    );

    if (existingIndex >= 0) {
      // Combine quantities
      userCart.items[existingIndex].quantity = Math.min(
        userCart.items[existingIndex].quantity + guestItem.quantity,
        config.cart.maxQuantity
      );
    } else {
      userCart.items.push(guestItem);
    }
  }

  // Recalculate totals
  const totals = calculateCartTotals(userCart.items, userCart.appliedVouchers);
  userCart.totalItems = userCart.items.reduce((sum, i) => sum + i.quantity, 0);
  userCart.subtotal = totals.subtotal;
  userCart.totalDiscount = totals.totalDiscount;
  userCart.totalPrice = totals.totalPrice;
  userCart.updatedAt = new Date();

  // Save user cart
  const key = getCartKey(userId);
  await client.setEx(key, config.cart.ttl, JSON.stringify(userCart));

  // Clear guest cart
  await client.del(`${CART_PREFIX}${guestCartId}`);

  logger.info('Guest cart merged', { userId, itemsMerged: guestItems.length });
  return userCart;
}

export default {
  connectRedis,
  disconnectRedis,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyVoucher,
  removeVoucher,
  getCartSummary,
  mergeGuestCart,
};
