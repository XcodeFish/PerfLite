/**
 * 性能指标类型
 */
export interface IPerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  source?: string;
}

/**
 * 网络请求性能指标
 */
export interface INetworkMetric extends IPerformanceMetric {
  url: string;
  method: string;
  status?: number;
  size?: number;
  duration?: number;
  initiatorType?: string;
}

/**
 * 核心性能指标类型
 */
export interface ICoreWebVitals {
  LCP?: IPerformanceMetric; // Largest Contentful Paint
  FID?: IPerformanceMetric; // First Input Delay
  CLS?: IPerformanceMetric; // Cumulative Layout Shift
  TTFB?: IPerformanceMetric; // Time To First Byte
  FCP?: IPerformanceMetric; // First Contentful Paint
}

/**
 * 性能分析器配置
 */
export interface IPerformanceAnalyzerConfig {
  captureResourceTiming: boolean;
  captureCorrelations: boolean;
  sampleRate: number;
  maxBufferSize: number;
  metricThresholds: {
    [key: string]: number;
  };
}

/**
 * 性能分析器接口
 */
export interface IPerformanceAnalyzer {
  captureMetric(metric: IPerformanceMetric): void;
  getMetrics(): IPerformanceMetric[];
  getCoreWebVitals(): ICoreWebVitals;
  correlateErrors(perfData: IPerformanceMetric[], errors: unknown[]): unknown[];
  setConfig(config: Partial<IPerformanceAnalyzerConfig>): void;
  getConfig(): IPerformanceAnalyzerConfig;
}
