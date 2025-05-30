import { IParsedError } from './error';

/**
 * 性能指标接口
 */
export interface IPerformanceMetric {
  /**
   * 指标名称
   */
  name: string;

  /**
   * 指标值
   */
  value: number;

  /**
   * 指标单位
   */
  unit: string;

  /**
   * 记录时间戳
   */
  timestamp: number;

  /**
   * 指标来源
   */
  source?: string;

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;
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
 * 资源计时信息
 */
export interface IResourceTiming {
  name: string;
  initiatorType: string;
  startTime: number;
  duration: number;
  transferSize?: number;
}

/**
 * 性能时间线
 */
export interface IPerformanceTimeline {
  metrics: IPerformanceMetric[];
  resources: IResourceTiming[];
  marks: { name: string; timestamp: number }[];
  measures: { name: string; duration: number; timestamp: number }[];
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
 * 带性能指标的错误
 */
export interface IErrorWithMetrics extends IParsedError {
  relatedMetrics?: IPerformanceMetric[];
  relatedResources?: IResourceTiming[];
}

/**
 * 性能报告
 */
export interface IPerformanceReport {
  timeline: IPerformanceTimeline;
  errors: IErrorWithMetrics[];
  score: number;
  suggestions: string[];
}

/**
 * 性能分析器接口
 */
export interface IPerformanceAnalyzer {
  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, unit?: string): void;

  /**
   * 获取所有性能指标
   */
  getMetrics(): IPerformanceMetric[];

  /**
   * 获取指定名称的性能指标
   */
  getMetricsByName(name: string): IPerformanceMetric[];

  /**
   * 清除性能指标
   */
  clearMetrics(): void;

  /**
   * 将错误与性能指标关联
   */
  correlateErrorsWithMetrics(errorTimestamp: number, timeWindow?: number): IPerformanceMetric[];
}
