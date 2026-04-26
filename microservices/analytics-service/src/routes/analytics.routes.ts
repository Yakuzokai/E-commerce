import { Router, Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';
import client from 'prom-client';

const router = Router();

// Prometheus metrics endpoint
const register = new client.Registry();
client.collectDefaultMetrics({ register });

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).end();
  }
});

// Dashboard metrics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const metrics = await analyticsService.getDashboardMetrics(days);
    res.json({ success: true, metrics });
  } catch (error) {
    logger.error('Dashboard metrics failed:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

// Real-time metrics
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    const metrics = await analyticsService.getRealTimeMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    logger.error('Real-time metrics failed:', error);
    res.status(500).json({ error: 'Failed to get real-time metrics' });
  }
});

// Hourly trend
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const trend = await analyticsService.getHourlyTrend(hours);
    res.json({ success: true, trend });
  } catch (error) {
    logger.error('Trend metrics failed:', error);
    res.status(500).json({ error: 'Failed to get trend' });
  }
});

// Track custom event
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { eventType, ...data } = req.body;
    await analyticsService.trackEvent(eventType, data);
    res.json({ success: true });
  } catch (error) {
    logger.error('Track event failed:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

export default router;