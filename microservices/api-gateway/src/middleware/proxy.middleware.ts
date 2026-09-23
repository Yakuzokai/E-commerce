import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import config from '../config';
import { logger } from '../utils/logger';

function createServiceProxy(target: string, pathRewrite?: Record<string, string>): any {
  const options: Options = {
    target,
    changeOrigin: true,
    ws: true,
    pathRewrite,
    onProxyReq: (proxyReq, req: Request, res: Response) => {
      // Forward correlation ID
      const correlationId = req.headers['x-correlation-id'] as string;
      if (correlationId) {
        proxyReq.setHeader('x-correlation-id', correlationId);
      }

      // Forward verified user claims from auth middleware
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id'] as string);
      }
      if (req.headers['x-user-role']) {
        proxyReq.setHeader('x-user-role', req.headers['x-user-role'] as string);
      }
      if (req.headers['x-user-email']) {
        proxyReq.setHeader('x-user-email', req.headers['x-user-email'] as string);
      }

      logger.debug(`Proxying ${req.method} ${req.originalUrl} -> ${target}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${req.url} -> ${target}:`, err);
      if ('writeHead' in res && typeof res.writeHead === 'function') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
          targetService: target,
        }));
      }
    },
  };

  return createProxyMiddleware(options);
}

// Proxies
export const authProxy = createServiceProxy(config.AUTH_SERVICE_URL);
export const userProxy = createServiceProxy(config.USER_SERVICE_URL);
export const productProxy = createServiceProxy(config.PRODUCT_SERVICE_URL);
export const cartProxy = createServiceProxy(config.CART_SERVICE_URL, { '^/api/v1/cart': '/api/users' });
export const orderProxy = createServiceProxy(config.ORDER_SERVICE_URL, { '^/api/v1/orders': '/api/orders' });
export const paymentProxy = createServiceProxy(config.PAYMENT_SERVICE_URL, { '^/api/v1/payments': '/api/payments' });
export const searchProxy = createServiceProxy(config.SEARCH_SERVICE_URL, { '^/api/v1/search': '/api/search' });
export const reviewProxy = createServiceProxy(config.REVIEW_SERVICE_URL, { '^/api/v1/reviews': '/api/reviews' });
export const recommendationProxy = createServiceProxy(config.RECOMMENDATION_SERVICE_URL, { '^/api/v1/recommendations': '/api/recommendations' });
export const notificationProxy = createServiceProxy(config.NOTIFICATION_SERVICE_URL, { '^/api/v1/notifications': '/api/notifications' });
export const analyticsProxy = createServiceProxy(config.ANALYTICS_SERVICE_URL);
export const chatProxy = createServiceProxy(config.CHAT_SERVICE_URL);
