import { cacheService } from './cache.service';
import { kafkaService } from './kafka.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import {
  Transaction,
  FraudCheckResult,
  RiskFactor,
  UserTransactionProfile
} from '../types';

/**
 * Core Fraud Detection Engine
 * Implements multi-layer fraud detection with real-time scoring
 */
export class FraudDetectionService {
  async initialize(): Promise<void> {
    // Subscribe to payment events
    await kafkaService.subscribe('payment.processed', async (data) => {
      await this.processTransaction(data as Transaction);
    });

    // Subscribe to order events for fraud analysis
    await kafkaService.subscribe('order.created', async (data) => {
      await this.analyzeOrder(data);
    });

    logger.info('Fraud Detection service initialized');
  }

  /**
   * Main fraud check method - evaluates a transaction
   */
  async checkTransaction(transaction: Transaction): Promise<FraudCheckResult> {
    const startTime = Date.now();
    const riskFactors: RiskFactor[] = [];

    // Get user profile
    const userProfile = await this.getUserProfile(transaction.userId);

    // Check velocity (too many transactions in short time)
    const velocityScore = await this.checkVelocity(transaction);
    riskFactors.push(velocityScore);

    // Check amount anomaly
    const amountScore = await this.checkAmountAnomaly(transaction, userProfile);
    riskFactors.push(amountScore);

    // Check geolocation
    const geoScore = await this.checkGeolocation(transaction, userProfile);
    riskFactors.push(geoScore);

    // Check device fingerprint
    const deviceScore = await this.checkDevice(transaction, userProfile);
    riskFactors.push(deviceScore);

    // Check user history
    const historyScore = await this.checkUserHistory(transaction, userProfile);
    riskFactors.push(historyScore);

    // Calculate overall risk score
    const totalWeight = Object.values(config.fraud.riskScoreWeights).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const riskScore = riskFactors.reduce((total: number, factor: any) => {
      if (factor.triggered) {
        return total + (factor.score * factor.weight / (totalWeight || 1));
      }
      return total;
    }, 0);

    // Determine risk level
    const riskLevel = this.getRiskLevel(riskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskFactors, riskLevel);

    const result: FraudCheckResult = {
      transactionId: transaction.transactionId,
      isSuspicious: riskScore >= config.fraud.threshold,
      riskScore,
      riskLevel,
      riskFactors,
      recommendations,
      actionRequired: riskLevel === 'high' || riskLevel === 'critical',
      processingTimeMs: Date.now() - startTime,
    };

    // Store result and update user profile
    await this.storeTransactionResult(transaction, result);
    await this.updateUserProfile(transaction, result);

    // Publish fraud alert if needed
    if (result.actionRequired) {
      await this.publishFraudAlert(transaction, result);
    }

    logger.info(`Fraud check completed for ${transaction.transactionId}: ${riskLevel} risk (${riskScore})`);

    return result;
  }

  private async checkVelocity(transaction: Transaction): Promise<RiskFactor> {
    const velocityKey = `velocity:${transaction.userId}`;
    const hourKey = `velocity:hour:${transaction.userId}`;

    // Get transactions in last hour
    const recentTx = await cacheService.lrange(velocityKey, 0, -1);
    const oneHourAgo = Date.now() - 3600000;
    const recentCount = recentTx.filter((tx: any) => tx.timestamp > oneHourAgo).length;

    // Add to velocity list
    await cacheService.lpush(velocityKey, { timestamp: Date.now(), amount: transaction.amount });
    await cacheService.ltrim(velocityKey, 0, 99); // Keep last 100
    await cacheService.expire(velocityKey, 86400); // 24 hours

    // Calculate score
    let score = 0;
    let triggered = false;
    const description = `Transaction velocity: ${recentCount + 1} per hour`;

    if (recentCount > 10) {
      score = 1.0;
      triggered = true;
    } else if (recentCount > 5) {
      score = 0.6;
      triggered = true;
    } else if (recentCount > 3) {
      score = 0.3;
      triggered = true;
    }

    return {
      name: 'velocity',
      score,
      weight: config.fraud.riskScoreWeights.velocity,
      description,
      triggered,
    };
  }

  private async checkAmountAnomaly(
    transaction: Transaction,
    profile: UserTransactionProfile | null
  ): Promise<RiskFactor> {
    let score = 0;
    let triggered = false;
    let description = '';

    if (profile && profile.avgTransactionAmount > 0) {
      const zScore = (transaction.amount - profile.avgTransactionAmount) / profile.stdDevAmount;
      description = `Amount: $${transaction.amount}, avg: $${profile.avgTransactionAmount.toFixed(2)}, z-score: ${zScore.toFixed(2)}`;

      if (Math.abs(zScore) > config.fraud.anomalyThreshold) {
        score = 1.0;
        triggered = true;
      } else if (Math.abs(zScore) > 2) {
        score = 0.7;
        triggered = true;
      } else if (Math.abs(zScore) > 1.5) {
        score = 0.4;
        triggered = true;
      }
    } else {
      // No history - check for unusually high amount
      description = `No transaction history, amount: $${transaction.amount}`;

      if (transaction.amount > 5000) {
        score = 0.8;
        triggered = true;
      } else if (transaction.amount > 1000) {
        score = 0.4;
        triggered = true;
      }
    }

    return {
      name: 'amount',
      score,
      weight: config.fraud.riskScoreWeights.amount,
      description,
      triggered,
    };
  }

  private async checkGeolocation(
    transaction: Transaction,
    profile: UserTransactionProfile | null
  ): Promise<RiskFactor> {
    let score = 0;
    let triggered = false;
    let description = 'Geolocation checks passed';

    if (transaction.geolocation && profile) {
      const currentCountry = transaction.geolocation.country;
      const commonCountries = profile.commonCountries || [];

      // Check if transaction is from new country
      if (!commonCountries.includes(currentCountry)) {
        score = 0.6;
        triggered = true;
        description = `New country: ${currentCountry}`;
      }
    } else if (!transaction.geolocation) {
      score = 0.3;
      description = 'No geolocation data available';
    }

    return {
      name: 'geolocation',
      score,
      weight: config.fraud.riskScoreWeights.geolocation,
      description,
      triggered,
    };
  }

  private async checkDevice(
    transaction: Transaction,
    profile: UserTransactionProfile | null
  ): Promise<RiskFactor> {
    let score = 0;
    let triggered = false;
    let description = 'Device check passed';

    if (transaction.deviceFingerprint && profile) {
      const knownDevices = profile.knownDevices || [];
      if (!knownDevices.includes(transaction.deviceFingerprint)) {
        score = 0.5;
        triggered = true;
        description = 'New device detected';
      }
    } else if (!transaction.deviceFingerprint) {
      score = 0.2;
      triggered = true;
      description = 'No device fingerprint';
    }

    return {
      name: 'device',
      score,
      weight: config.fraud.riskScoreWeights.device,
      description,
      triggered,
    };
  }

  private async checkUserHistory(
    transaction: Transaction,
    profile: UserTransactionProfile | null
  ): Promise<RiskFactor> {
    let score = 0;
    let triggered = false;
    let description = 'User history check passed';

    if (profile) {
      const fraudRatio = profile.fraudCount / Math.max(profile.transactionCount, 1);

      if (fraudRatio > 0.2) {
        score = 1.0;
        triggered = true;
        description = `High fraud ratio: ${(fraudRatio * 100).toFixed(1)}%`;
      } else if (fraudRatio > 0.1) {
        score = 0.7;
        triggered = true;
        description = `Moderate fraud ratio: ${(fraudRatio * 100).toFixed(1)}%`;
      } else if (profile.flaggedCount > 5) {
        score = 0.5;
        triggered = true;
        description = `High flag count: ${profile.flaggedCount}`;
      }
    }

    return {
      name: 'history',
      score,
      weight: config.fraud.riskScoreWeights.history,
      description,
      triggered,
    };
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private generateRecommendations(factors: RiskFactor[], level: string): string[] {
    const recommendations: string[] = [];

    const triggeredFactors = factors.filter(f => f.triggered);

    if (level === 'critical') {
      recommendations.push('Block transaction and require manual review');
      recommendations.push('Notify fraud investigation team immediately');
    }

    if (level === 'high' || level === 'critical') {
      recommendations.push('Send one-time password to user phone');
      recommendations.push('Verify billing address');
    }

    triggeredFactors.forEach(factor => {
      switch (factor.name) {
        case 'velocity':
          recommendations.push('Enable velocity limits for user');
          break;
        case 'amount':
          recommendations.push('Require additional verification for large amounts');
          break;
        case 'geolocation':
          recommendations.push('Verify user identity with location-based challenge');
          break;
        case 'device':
          recommendations.push('Send confirmation to registered device');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async getUserProfile(userId: string): Promise<UserTransactionProfile | null> {
    return cacheService.get<UserTransactionProfile>(`profile:${userId}`);
  }

  private async updateUserProfile(
    transaction: Transaction,
    result: FraudCheckResult
  ): Promise<void> {
    const profileKey = `profile:${transaction.userId}`;
    let profile = await this.getUserProfile(transaction.userId);

    if (!profile) {
      profile = {
        userId: transaction.userId,
        avgTransactionAmount: 0,
        stdDevAmount: 0,
        maxTransactionAmount: 0,
        transactionCount: 0,
        avgTransactionsPerDay: 0,
        commonMerchantCategories: [],
        commonPaymentMethods: [],
        commonCountries: transaction.geolocation ? [transaction.geolocation.country] : [],
        lastTransactionDate: new Date(),
        firstTransactionDate: new Date(),
        knownDevices: transaction.deviceFingerprint ? [transaction.deviceFingerprint] : [],
        knownIpAddresses: [transaction.ipAddress],
        flaggedCount: 0,
        fraudCount: 0,
        lastUpdated: new Date(),
      };
    }

    // Update running statistics
    const n = profile.transactionCount;
    const newAvg = ((profile.avgTransactionAmount * n) + transaction.amount) / (n + 1);
    const newVariance = ((n * (profile.stdDevAmount ** 2 + profile.avgTransactionAmount ** 2)) +
      transaction.amount ** 2) / (n + 1) - newAvg ** 2;

    profile.avgTransactionAmount = newAvg;
    profile.stdDevAmount = Math.sqrt(newVariance);
    profile.maxTransactionAmount = Math.max(profile.maxTransactionAmount, transaction.amount);
    profile.transactionCount = n + 1;
    profile.lastTransactionDate = new Date();

    if (transaction.geolocation?.country &&
      !profile.commonCountries.includes(transaction.geolocation.country)) {
      profile.commonCountries.push(transaction.geolocation.country);
    }

    if (transaction.deviceFingerprint &&
      !profile.knownDevices.includes(transaction.deviceFingerprint)) {
      profile.knownDevices.push(transaction.deviceFingerprint);
    }

    if (!profile.knownIpAddresses.includes(transaction.ipAddress)) {
      profile.knownIpAddresses.push(transaction.ipAddress);
    }

    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      profile.flaggedCount++;
    }

    if (result.riskLevel === 'critical') {
      profile.fraudCount++;
    }

    profile.lastUpdated = new Date();

    await cacheService.set(profileKey, profile, 2592000); // 30 days TTL
  }

  private async storeTransactionResult(
    transaction: Transaction,
    result: FraudCheckResult
  ): Promise<void> {
    const key = `tx_result:${transaction.transactionId}`;
    await cacheService.set(key, { transaction, result }, 86400 * 90); // 90 days
  }

  private async processTransaction(transaction: Transaction): Promise<void> {
    await this.checkTransaction(transaction);
  }

  private async analyzeOrder(order: any): Promise<void> {
    logger.debug('Analyzing order for fraud:', order);
  }

  private async publishFraudAlert(
    transaction: Transaction,
    result: FraudCheckResult
  ): Promise<void> {
    await kafkaService.publish('fraud.alert', {
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      triggeredFactors: result.riskFactors.filter(f => f.triggered).map(f => f.name),
      timestamp: Date.now(),
    });
  }
}

export const fraudDetectionService = new FraudDetectionService();