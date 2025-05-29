/**
 * API计数器配置
 */
export interface IAPICounterConfig {
  maxFree: number;
  resetPeriod: 'daily' | 'monthly' | 'never';
  storageKey?: string;
  alertThreshold?: number;
  serviceId?: string;
  quotaExceededAction?: 'block' | 'warn' | 'fallback';
  errorMargin?: number;
}

/**
 * API计数器状态
 */
export interface IAPICounterStatus {
  count: number;
  remaining: number;
  resetDate?: Date;
  isLimited: boolean;
  usagePercentage: number;
  isApproachingLimit: boolean;
  nextResetTime?: number;
  history?: {
    date: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * API计数器配额类型
 */
export interface IAPIQuota {
  service: string;
  limit: number;
  period: 'daily' | 'monthly' | 'annual';
  used: number;
  remaining: number;
  resetDate: Date;
}

/**
 * API计数器请求详情
 */
export interface IAPIRequest {
  id: string;
  timestamp: number;
  service: string;
  endpoint: string;
  tokensUsed?: number;
  successful: boolean;
  latency?: number;
  error?: string;
}

/**
 * API计数器接口
 */
export interface IAPICounter {
  check(): boolean;
  increment(tokensUsed?: number): boolean;
  getStatus(): IAPICounterStatus;
  reset(): void;
  setConfig(config: Partial<IAPICounterConfig>): void;
  getConfig(): IAPICounterConfig;
  trackRequest(request: IAPIRequest): void;
  getUsageHistory(days?: number): IAPIRequest[];
  getUsageTrend(): {
    period: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  }[];
  estimateRemainingUsage(): {
    daysRemaining: number;
    estimatedDepletionDate?: Date;
  };
  getQuota(): IAPIQuota;
  subscribe(callback: (status: IAPICounterStatus) => void): () => void;
  notifyApproachingLimit(threshold?: number): boolean;
}
