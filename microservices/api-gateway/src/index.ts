import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config';
import { logger } from './utils/logger';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import {
  authProxy,
  userProxy,
  productProxy,
  cartProxy,
  orderProxy,
  paymentProxy,
  searchProxy,
  reviewProxy,
  recommendationProxy,
  notificationProxy,
  analyticsProxy,
  chatProxy,
} from './middleware/proxy.middleware';

const app = express();
const server = http.createServer(app);

// 1. Security & Edge Middleware
app.use(helmet({
  contentSecurityPolicy: config.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: config.NODE_ENV === 'production',
}));

app.use(cors({
  origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-api-key'],
}));

// 2. Correlation ID & Request Logging
app.use(correlationMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      correlationId: req.headers['x-correlation-id'],
    });
  });
  next();
});

// 3. Global Rate Limiter
app.use(rateLimit({
  windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(config.RATE_LIMIT_MAX_REQUESTS, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
}));

// 4. Ingress Health Check & Gateway Info Probe
app.get(['/', '/health'], (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    routes: {
      auth: config.AUTH_SERVICE_URL,
      users: config.USER_SERVICE_URL,
      products: config.PRODUCT_SERVICE_URL,
      cart: config.CART_SERVICE_URL,
      orders: config.ORDER_SERVICE_URL,
      payments: config.PAYMENT_SERVICE_URL,
      search: config.SEARCH_SERVICE_URL,
      reviews: config.REVIEW_SERVICE_URL,
      recommendations: config.RECOMMENDATION_SERVICE_URL,
      notifications: config.NOTIFICATION_SERVICE_URL,
      analytics: config.ANALYTICS_SERVICE_URL,
      chat: config.CHAT_SERVICE_URL,
    },
  });
});

// 5. Authentication Verification Layer
app.use(authMiddleware);

// 6. Microservice Proxy Routes
app.use('/api/v1/auth', authProxy);
app.use('/api/v1/users', userProxy);
app.use('/api/v1/products', productProxy);
app.use('/api/v1/categories', productProxy);
app.use('/api/v1/cart', cartProxy);
app.use('/api/v1/orders', orderProxy);
app.use('/api/v1/payments', paymentProxy);
app.use('/webhooks/stripe', paymentProxy);
app.use('/api/v1/search', searchProxy);
app.use('/api/v1/reviews', reviewProxy);
app.use('/api/v1/recommendations', recommendationProxy);
app.use('/api/v1/behavior', recommendationProxy);
app.use('/api/v1/notifications', notificationProxy);
app.use('/api/v1/analytics', analyticsProxy);
app.use('/socket.io', chatProxy);

// 7. Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found on API Gateway`,
    code: 'NOT_FOUND',
  });
});

// 8. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled Gateway Error:', err);
  res.status(500).json({
    error: 'Internal Gateway Error',
    code: 'GATEWAY_ERROR',
  });
});

// 9. Start Server
const PORT = parseInt(config.PORT, 10);
server.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT} [${config.NODE_ENV}]`);
});

export default app;
