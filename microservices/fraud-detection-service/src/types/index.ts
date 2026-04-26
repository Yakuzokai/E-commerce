export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  merchantId: string;
  merchantCategory: string;
  timestamp: Date;
  ipAddress: string;
  deviceFingerprint?: string;
  shippingAddress?: string;
  billingAddress?: string;
  geolocation?: {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  metadata?: Record<string, any>;
}

export interface FraudCheckResult {
  transactionId: string;
  isSuspicious: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
  actionRequired: boolean;
  processingTimeMs: number;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  triggered: boolean;
}

export interface UserTransactionProfile {
  userId: string;
  avgTransactionAmount: number;
  stdDevAmount: number;
  maxTransactionAmount: number;
  transactionCount: number;
  avgTransactionsPerDay: number;
  commonMerchantCategories: string[];
  commonPaymentMethods: string[];
  commonCountries: string[];
  lastTransactionDate: Date;
  firstTransactionDate: Date;
  knownDevices: string[];
  knownIpAddresses: string[];
  flaggedCount: number;
  fraudCount: number;
  lastUpdated: Date;
}

export interface AnomalyDetectionModel {
  type: 'isolation_forest' | 'zscore' | 'dbscan';
  threshold: number;
  features: string[];
  trainedAt: Date;
  accuracy?: number;
}