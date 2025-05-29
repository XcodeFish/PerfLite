export interface Error {
  message: string;
  stack: string;
  timestamp: number;
}

export interface PerformanceMetric {
  timestamp: number;
  duration: number;
  resourceName: string;
}

export interface Plugin {
  name: string;
  beforeSend?: (data: unknown) => void;
  afterSend?: (response: unknown) => void;
}

export interface VisualizationOptions {
  theme?: 'light' | 'dark';
  maxDataPoints?: number;
  chartType?: string;
}

// 导出错误相关类型
export * from './error';

// 导出性能相关类型
export * from './perf';

// 导出配置相关类型
export * from './config';

// 导出可视化相关类型
export * from './visualization';

// 导出缓存相关类型
export * from './cache';

// 导出解析器相关类型
export * from './parser';

// 导出插件相关类型
export * from './plugin';

// 导出API计数器相关类型
export { IAPICounterStatus, IAPICounter } from './api-counter';

// 重新导出API计数器配置（解决命名冲突）
export { IAPICounterConfig as IAPICounterSettings } from './api-counter';

// PerfLite主接口
import { IErrorParser } from './error';
import { IPerformanceAnalyzer } from './perf';
import { IVisualization } from './visualization';
import { ICacheSystem } from './cache';
import { IPluginManager } from './plugin';
import { IAPICounter } from './api-counter';
import { IPerfLiteConfig } from './config';

/**
 * PerfLite SDK主接口
 */
export interface IPerfLite {
  /**
   * 初始化SDK
   */
  init(config: Partial<IPerfLiteConfig>): Promise<boolean>;

  /**
   * 获取错误解析器实例
   */
  getErrorParser(): IErrorParser;

  /**
   * 获取性能分析器实例
   */
  getPerformanceAnalyzer(): IPerformanceAnalyzer;

  /**
   * 获取可视化引擎实例
   */
  getVisualization(): IVisualization;

  /**
   * 获取缓存系统实例
   */
  getCacheSystem(): ICacheSystem;

  /**
   * 获取插件管理器实例
   */
  getPluginManager(): IPluginManager;

  /**
   * 获取API计数器实例
   */
  getAPICounter(): IAPICounter;

  /**
   * 手动捕获错误
   */
  captureError(error: Error | string): Promise<string>;

  /**
   * 手动捕获性能指标
   */
  capturePerformance(name: string, value: number, unit?: string): void;

  /**
   * 启用SDK
   */
  enable(): void;

  /**
   * 禁用SDK
   */
  disable(): void;

  /**
   * 销毁SDK实例
   */
  destroy(): Promise<void>;
}
