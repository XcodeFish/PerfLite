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
}

/**
 * API计数器配置
 */
export interface IAPICounterConfig {
  maxFree: number;
  resetPeriod: 'daily' | 'monthly' | 'never';
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
  deepseek: IDeepSeekConfig;
  cache: ICacheConfig;
  visualization: IVisualizationConfig;
  plugins?: Record<string, unknown>;
  apiCounter?: IAPICounterConfig;
}
