import { kafkaService } from './kafka.service';
import { logger } from '../utils/logger';
import { UserBehavior } from '../models/types';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variants: ABVariant[];
  targetAudience: {
    percentage: number;
    conditions?: Record<string, any>;
  };
  startDate: Date;
  endDate?: Date;
  metrics: ABMetric[];
  results?: ABResults;
}

export interface ABVariant {
  id: string;
  name: string;
  weight: number;
  description?: string;
  config: Record<string, any>;
}

export interface ABMetric {
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'custom';
  aggregation: 'sum' | 'average' | 'count';
}

export interface ABResults {
  control: Record<string, number>;
  variants: Record<string, Record<string, number>>;
  winner?: string;
  confidence: number;
  pValue: number;
}

export class ABTestingService {
  private activeTests: Map<string, ABTest> = new Map();

  async initialize(): Promise<void> {
    await kafkaService.subscribe('experiment.start', async (data) => {
      await this.startExperiment(data as ABTest);
    });

    await kafkaService.subscribe('experiment.stop', async (data) => {
      await this.stopExperiment((data as any).id);
    });

    logger.info('A/B Testing service initialized');
  }

  async createTest(test: Omit<ABTest, 'id' | 'status' | 'results'>): Promise<ABTest> {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTest: ABTest = {
      ...test,
      id,
      status: 'draft',
    };

    this.activeTests.set(id, newTest);
    logger.info(`Created A/B test: ${id} - ${test.name}`);

    return newTest;
  }

  async startExperiment(test: ABTest): Promise<void> {
    const existingTest = this.activeTests.get(test.id);
    if (existingTest) {
      existingTest.status = 'running';
      logger.info(`Started A/B test: ${test.id}`);
    }
  }

  async stopExperiment(testId: string): Promise<void> {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'completed';
      test.endDate = new Date();
      await this.analyzeResults(testId);
      logger.info(`Stopped A/B test: ${testId}`);
    }
  }

  getVariant(testId: string, userId: string): ABVariant | null {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') return null;

    const hash = this.hashUserTest(userId, testId);
    const normalized = hash % 100;

    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (normalized < cumulative) {
        return variant;
      }
    }

    return test.variants[0];
  }

  async analyzeResults(testId: string): Promise<ABResults | null> {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    const control = { conversions: 0, impressions: 0 };
    const variantResults: Record<string, { conversions: number; impressions: number }> = {};

    for (const variant of test.variants) {
      variantResults[variant.id] = { conversions: 0, impressions: 0 };
    }

    const results: ABResults = {
      control,
      variants: variantResults,
      confidence: 0,
      pValue: 0,
    };

    const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;
    let bestVariant = test.variants[0];
    let bestRate = controlRate;

    for (const variant of test.variants) {
      const rate = variantResults[variant.id].impressions > 0
        ? variantResults[variant.id].conversions / variantResults[variant.id].impressions
        : 0;

      if (rate > bestRate) {
        bestRate = rate;
        bestVariant = variant;
      }
    }

    if (bestVariant.id !== test.variants[0].id && bestRate > controlRate) {
      results.winner = bestVariant.id;
      results.confidence = 0.95;
      results.pValue = 0.05;
    }

    test.results = results;
    return results;
  }

  async getTestResults(testId: string): Promise<ABResults | null> {
    const test = this.activeTests.get(testId);
    return test?.results || null;
  }

  listTests(status?: ABTest['status']): ABTest[] {
    const tests = Array.from(this.activeTests.values());
    return status ? tests.filter(t => t.status === status) : tests;
  }

  private hashUserTest(userId: string, testId: string): number {
    let hash = 0;
    const str = userId + testId;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const abTestingService = new ABTestingService();