/**
 * API计数器配置
 */
export interface IAPICounterConfig {
  maxFree: number;
  resetPeriod: 'daily' | 'monthly' | 'never';
  storageKey?: string;
}

/**
 * API计数器状态
 */
export interface IAPICounterStatus {
  count: number;
  remaining: number;
  resetDate?: Date;
  isLimited: boolean;
}

/**
 * API计数器接口
 */
export interface IAPICounter {
  check(): boolean;
  increment(): boolean;
  getStatus(): IAPICounterStatus;
  reset(): void;
  setConfig(config: Partial<IAPICounterConfig>): void;
  getConfig(): IAPICounterConfig;
}
