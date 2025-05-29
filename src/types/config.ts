/**
 * DeepSeek 配置选项
 */
export interface IDeepSeekConfig {
  enable: boolean;
  apiKey?: string;
  endpoint?: string;
  fallback: 'local' | 'none';
  rateLimit: number;
  quotaMode?: 'economy' | 'standard';
  maxTokens?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 缓存配置选项
 */
export interface ICacheConfig {
  enable: boolean;
  memoryTTL: number;
  maxMemoryItems: number;
  diskTTL: number;
  maxDiskSize: string;
  precache?: string[];
  compression?: boolean;
  strategy?: 'lru' | 'fifo' | 'lfu';
  storageType?: 'indexeddb' | 'localstorage' | 'none';
}

/**
 * 可视化配置选项
 */
export interface IVisualizationConfig {
  enable: boolean;
  theme: 'light' | 'dark' | 'auto';
  maxDataPoints: number;
  chartType: 'sankey' | 'heatmap' | 'line' | 'bar';
  renderEngine?: 'canvas' | 'webgl';
  autoRefresh: boolean;
  refreshInterval: number;
  customColors?: Record<string, string>;
  dashboard?: {
    layout: 'grid' | 'free';
    widgets: {
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      dataSource: string;
    }[];
  };
}

/**
 * 安全配置选项
 */
export interface ISecurityConfig {
  sanitize: boolean;
  anonymizeIp: boolean;
  allowedDomains: string[];
  disableSensitiveData: boolean;
  httpsOnly: boolean;
  maxReportSize?: number;
}

/**
 * 上报配置选项
 */
export interface IReportingConfig {
  endpoint?: string;
  batchSize: number;
  batchInterval: number;
  retryCount: number;
  retryDelay: number;
  maxReportsPerPage: number;
  sendBeacon?: boolean;
  compression?: boolean;
  timeout?: number;
}

/**
 * 采样配置选项
 */
export interface ISamplingConfig {
  errorSamplingRate: number;
  performanceSamplingRate: number;
  userSamplingRate: number;
  samplingMethod: 'random' | 'consistent' | 'adaptive';
}

/**
 * API计数器配置
 */
export interface IAPICounterConfig {
  maxFree: number;
  resetPeriod: 'daily' | 'monthly' | 'never';
  storageKey?: string;
}

/**
 * PerfLite 主配置接口
 */
export interface IPerfLiteConfig {
  appId: string;
  enable: boolean;
  sampleRate: number;
  reportURI?: string;
  errorCapture: boolean;
  performanceCapture: boolean;
  environment?: 'production' | 'development' | 'staging' | 'test';
  version?: string;
  deepseek: IDeepSeekConfig;
  cache: ICacheConfig;
  visualization: IVisualizationConfig;
  plugins?: Record<string, unknown>;
  apiCounter?: IAPICounterConfig;
  security?: ISecurityConfig;
  reporting?: IReportingConfig;
  sampling?: ISamplingConfig;
}
