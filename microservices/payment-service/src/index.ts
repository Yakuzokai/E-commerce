/**
 * Payment Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { connectProducer, disconnectProducer } from './services/kafka.service';
import * as paymentService from './services/payment.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Webhook endpoint for payment providers (Stripe, etc.)
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  // In production, verify webhook signature
  const event = JSON.parse(req.body.toString());

  logger.info('Received Stripe webhook', { type: event.type });

  switch (event.type) {
    case 'payment_intent.succeeded':
      await paymentService.processPayment(event.data.object.metadata.paymentId);
      break;
    case 'payment_intent.payment_failed':
      logger.error('Stripe payment failed', { error: event.data.object.last_payment_error });
      break;
  }

  res.json({ received: true });
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'payment-service' });
});

// Routes

/**
 * Create payment
 * POST /api/payments
 */
app.post('/api/payments', async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error: any) {
    logger.error('Error creating payment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
app.get('/api/payments/:id', async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error: any) {
    logger.error('Error getting payment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get payment by order ID
 * GET /api/payments/order/:orderId
 */
app.get('/api/payments/order/:orderId', async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.getPaymentByOrderId(req.params.orderId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error: any) {
    logger.error('Error getting payment by order', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's payments
 * GET /api/users/:userId/payments
 */
app.get('/api/users/:userId/payments', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await paymentService.getPaymentsByUser(req.params.userId, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting user payments', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process payment
 * POST /api/payments/:id/process
 */
app.post('/api/payments/:id/process', async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.processPayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error: any) {
    logger.error('Error processing payment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create refund
 * POST /api/payments/:id/refund
 */
app.post('/api/payments/:id/refund', async (req: Request, res: Response) => {
  try {
    const { amount, reason } = req.body;
    const refund = await paymentService.createRefund({
      paymentId: req.params.id,
      amount,
      reason,
    });
    res.status(201).json(refund);
  } catch (error: any) {
    logger.error('Error creating refund', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get refunds for payment
 * GET /api/payments/:id/refunds
 */
app.get('/api/payments/:id/refunds', async (req: Request, res: Response) => {
  try {
    const refunds = await paymentService.getRefundsByPayment(req.params.id);
    res.json(refunds);
  } catch (error: any) {
    logger.error('Error getting refunds', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process refund
 * POST /api/refunds/:id/process
 */
app.post('/api/refunds/:id/process', async (req: Request, res: Response) => {
  try {
    const refund = await paymentService.processRefund(req.params.id);
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    res.json(refund);
  } catch (error: any) {
    logger.error('Error processing refund', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await disconnectProducer();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    await runMigrations();
    await connectProducer();
    app.listen(config.port, () => {
      logger.info(`Payment service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
