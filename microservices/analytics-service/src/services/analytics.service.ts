import { cacheService } from './cache.service';
import { kafkaService } from './kafka.service';
import { logger } from '../utils/logger';

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  productId?: string;
  orderId?: string;
  category?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  averageOrderValue: number;
  conversionRate: number;
  revenue24h: number;
  orders24h: number;
  topCategories: Array<{ name: string; revenue: number; orders: number }>;
  topProducts: Array<{ productId: string; name: string; revenue: number; units: number }>;
}

export interface RealTimeMetrics {
  activeUsers: number;
  ordersPerMinute: number;
  revenuePerMinute: number;
  cartAbandonmentRate: number;
  conversionRate: number;
}

/**
 * Real-time Analytics Pipeline
 * Processes events and provides real-time metrics
 */
export class AnalyticsService {
  async initialize(): Promise<void> {
    // Subscribe to all event types
    await kafkaService.subscribe('user.behavior', async (data) => {
      await this.trackEvent('user_behavior', data);
    });

    await kafkaService.subscribe('order.created', async (data) => {
      await this.trackEvent('order_created', data);
    });

    await kafkaService.subscribe('order.completed', async (data) => {
      await this.trackEvent('order_completed', data);
    });

    await kafkaService.subscribe('payment.processed', async (data) => {
      await this.trackEvent('payment_processed', data);
    });

    await kafkaService.subscribe('product.viewed', async (data) => {
      await this.trackEvent('product_viewed', data);
    });

    await kafkaService.subscribe('user.registered', async (data) => {
      await this.trackEvent('user_registered', data);
    });

    logger.info('Analytics service initialized');
  }

  async trackEvent(type: string, data: any): Promise<void> {
    const event: AnalyticsEvent = {
      eventType: type,
      userId: data.userId,
      productId: data.productId,
      orderId: data.orderId,
      category: data.category,
      value: data.amount || data.price || 0,
      metadata: data,
      timestamp: Date.now(),
    };

    try {
      // Update real-time counters
      await this.updateCounters(event);

      // Update time-series data
      await this.updateTimeSeries(event);

      // Update aggregation data
      await this.updateAggregations(event);

      logger.debug(`Tracked event: ${type}`, event);
    } catch (error) {
      logger.error(`Failed to track event ${type}:`, error);
    }
  }

  private async updateCounters(event: AnalyticsEvent): Promise<void> {
    const dayKey = this.getDayKey(event.timestamp);

    // Total counters
    await cacheService.increment('counters:total_events');
    await cacheService.increment(`counters:daily:${dayKey}:events`);

    if (event.eventType === 'order_completed' || event.eventType === 'payment_processed') {
      if (event.value) {
        // Revenue
        await cacheService.redis.incrbyfloat(`counters:total_revenue`, event.value);
        await cacheService.redis.incrbyfloat(`counters:daily:${dayKey}:revenue`, event.value);
      }

      // Orders
      await cacheService.increment('counters:total_orders');
      await cacheService.increment(`counters:daily:${dayKey}:orders`);
    }

    if (event.eventType === 'user_registered') {
      await cacheService.increment('counters:total_users');
      await cacheService.increment(`counters:daily:${dayKey}:users`);
    }

    if (event.eventType === 'product_viewed' || event.eventType === 'product_purchased') {
      await cacheService.increment(`counters:total_product_views:${event.productId}`);
      await cacheService.increment(`counters:product_views:daily:${dayKey}:${event.productId}`);
    }

    // Active users (rolling window)
    if (event.userId) {
      const minuteKey = this.getMinuteKey(event.timestamp);
      await cacheService.redis.sadd(`active_users:${minuteKey}`, event.userId);
      await cacheService.redis.expire(`active_users:${minuteKey}`, 3600); // 1 hour
    }
  }

  private async updateTimeSeries(event: AnalyticsEvent): Promise<void> {
    const hourKey = this.getHourKey(event.timestamp);

    if (event.eventType === 'order_completed' || event.eventType === 'payment_processed') {
      if (event.value) {
        await cacheService.zincrby('timeseries:hourly_revenue', event.value, hourKey);
      }
      await cacheService.zincrby('timeseries:hourly_orders', 1, hourKey);
    }

    if (event.eventType === 'product_viewed') {
      await cacheService.zincrby('timeseries:hourly_views', 1, hourKey);
    }

    // Keep last 30 days of hourly data
    await cacheService.redis.zremrangebyscore('timeseries:hourly_revenue', '-inf', this.getDayTimestamp(Date.now() - 30 * 24 * 3600000));
  }

  private async updateAggregations(event: AnalyticsEvent): Promise<void> {
    const dayKey = this.getDayKey(event.timestamp);

    if (event.category) {
      // Category revenue
      await cacheService.hincrby(`agg:daily:${dayKey}:category_revenue`, event.category, event.value || 0);
      await cacheService.hincrby(`agg:daily:${dayKey}:category_orders`, event.category, 1);
    }

    if (event.productId) {
      // Product performance
      await cacheService.hincrby(`agg:product:${event.productId}:daily:${dayKey}`, 'views', event.eventType === 'product_viewed' ? 1 : 0);
      await cacheService.hincrby(`agg:product:${event.productId}:daily:${dayKey}`, 'orders', event.eventType === 'order_completed' ? 1 : 0);
      await cacheService.hincrby(`agg:product:${event.productId}:daily:${dayKey}`, 'revenue', event.value || 0);
    }

    if (event.userId) {
      // User engagement
      await cacheService.hincrby(`agg:user:${event.userId}:daily:${dayKey}`, 'actions', 1);
    }
  }

  async getDashboardMetrics(days: number = 7): Promise<DashboardMetrics> {
    const metrics: DashboardMetrics = {
      totalRevenue: 0,
      totalOrders: 0,
      totalUsers: 0,
      totalProducts: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      revenue24h: 0,
      orders24h: 0,
      topCategories: [],
      topProducts: [],
    };

    // Calculate for last N days
    for (let i = 0; i < days; i++) {
      const dayKey = this.getDayKey(Date.now() - i * 24 * 3600000);
      const revenue = await cacheService.get<number>(`counters:daily:${dayKey}:revenue`);
      const orders = await cacheService.get<number>(`counters:daily:${dayKey}:orders`);
      const users = await cacheService.get<number>(`counters:daily:${dayKey}:users`);

      if (i === 0) {
        metrics.revenue24h = revenue || 0;
        metrics.orders24h = orders || 0;
      }

      metrics.totalRevenue += revenue || 0;
      metrics.totalOrders += orders || 0;
      metrics.totalUsers += users || 0;
    }

    metrics.averageOrderValue = metrics.totalOrders > 0
      ? metrics.totalRevenue / metrics.totalOrders
      : 0;

    // Conversion rate (orders / views)
    const totalViews = await cacheService.get<number>('counters:total_product_views');
    metrics.conversionRate = totalViews > 0
      ? (metrics.totalOrders / totalViews) * 100
      : 0;

    // Get top categories
    const dayKey = this.getDayKey(Date.now());
    const categoryRevenue = await cacheService.hgetall<number>(`agg:daily:${dayKey}:category_revenue`);
    if (categoryRevenue) {
      metrics.topCategories = Object.entries(categoryRevenue)
        .map(([name, revenue]) => ({ name, revenue, orders: 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    }

    return metrics;
  }

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    // Count active users (last 5 minutes)
    const now = Date.now();
    let activeUsersCount = 0;
    for (let i = 0; i < 5; i++) {
      const minuteKey = this.getMinuteKey(now - i * 60000);
      const users = await cacheService.redis.smembers(`active_users:${minuteKey}`);
      activeUsersCount += users.length;
    }

    // Get current rates (last hour aggregated to per-minute)
    const currentHour = this.getHourKey(now);
    const revenuePerHour = await cacheService.zscore('timeseries:hourly_revenue', currentHour) || 0;
    const ordersPerHour = await cacheService.zscore('timeseries:hourly_orders', currentHour) || 0;

    return {
      activeUsers: activeUsersCount,
      ordersPerMinute: ordersPerHour / 60,
      revenuePerMinute: revenuePerHour / 60,
      cartAbandonmentRate: 0, // Would need cart data
      conversionRate: 0, // Would need views data
    };
  }

  async getHourlyTrend(hours: number = 24): Promise<Array<{ hour: string; revenue: number; orders: number }>> {
    const trend: Array<{ hour: string; revenue: number; orders: number }> = [];

    for (let i = 0; i < hours; i++) {
      const hourKey = this.getHourKey(Date.now() - i * 3600000);
      const revenue = await cacheService.zscore('timeseries:hourly_revenue', hourKey) || 0;
      const orders = await cacheService.zscore('timeseries:hourly_orders', hourKey) || 0;

      trend.unshift({
        hour: hourKey,
        revenue,
        orders,
      });
    }

    return trend;
  }

  private getDayKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private getHourKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${this.getDayKey(timestamp)}_${String(date.getHours()).padStart(2, '0')}`;
  }

  private getMinuteKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${this.getDayKey(timestamp)}_${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private getDayTimestamp(timestamp: number): number {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
}

export const analyticsService = new AnalyticsService();