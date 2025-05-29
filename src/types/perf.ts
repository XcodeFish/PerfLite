/**
 * 性能指标类型
 */
export interface IPerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  source?: string;
  category?: 'navigation' | 'resource' | 'paint' | 'memory' | 'custom';
  labels?: Record<string, string>;
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
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  priority?: string;
  protocol?: string;
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
  INP?: IPerformanceMetric; // Interaction to Next Paint
  TBT?: IPerformanceMetric; // Total Blocking Time
}

/**
 * 内存使用指标
 */
export interface IMemoryMetric extends IPerformanceMetric {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  category: 'memory';
}

/**
 * 性能时间线
 */
export interface IPerformanceTimeline {
  metrics: IPerformanceMetric[];
  errors?: unknown[];
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime: number;
  url: string;
  userAgent?: string;
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
  automaticCapture: boolean;
  captureMemory: boolean;
  intervalCapture?: number;
  customMetrics?: string[];
}

/**
 * 性能分析结果
 */
export interface IPerformanceAnalysisResult {
  score: number;
  issues: {
    severity: 'critical' | 'warning' | 'info';
    metric: string;
    value: number;
    threshold: number;
    recommendation: string;
  }[];
  summary: string;
  trends?: {
    metric: string;
    values: number[];
    trend: 'improving' | 'degrading' | 'stable';
  }[];
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
  analyzePerformance(): IPerformanceAnalysisResult;
  getTimeline(startTime: number, endTime: number): IPerformanceTimeline;
  startAutomaticCapture(): void;
  stopAutomaticCapture(): void;
  getResourceMetrics(): INetworkMetric[];
  getMemoryMetrics(): IMemoryMetric[];
  clearMetrics(): void;
}
