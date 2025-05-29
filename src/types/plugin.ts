import { IPerformanceMetric } from './perf';
import { IParsedError } from './error';

/**
 * 插件生命周期钩子
 */
export interface IPluginHooks<T = unknown> {
  /**
   * 初始化钩子
   */
  init?: (config?: unknown) => void | Promise<void>;

  /**
   * 错误处理前钩子
   */
  beforeErrorCapture?: (error: Error) => Error | false;

  /**
   * 错误处理后钩子
   */
  afterErrorParse?: (parsedError: IParsedError) => IParsedError | false;

  /**
   * 性能指标捕获前钩子
   */
  beforeMetricCapture?: (metric: IPerformanceMetric) => IPerformanceMetric | false;

  /**
   * 性能指标处理后钩子
   */
  afterMetricProcess?: (metric: IPerformanceMetric) => IPerformanceMetric | false;

  /**
   * 数据发送前钩子
   */
  beforeSend?: (data: T) => T | false;

  /**
   * 数据发送后钩子
   */
  afterSend?: (data: T, response: unknown) => void;

  /**
   * 销毁钩子
   */
  destroy?: () => void | Promise<void>;
}

/**
 * 插件配置接口
 */
export interface IPluginConfig {
  name: string;
  version: string;
  enabled: boolean;
  [key: string]: unknown;
}

/**
 * 插件接口
 */
export interface IPlugin<T = unknown> {
  name: string;
  version: string;
  hooks: IPluginHooks<T>;
  config: IPluginConfig;
  init(config?: unknown): Promise<boolean>;
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  destroy(): Promise<void>;
}

/**
 * 插件管理器接口
 */
export interface IPluginManager {
  register(name: string, plugin: IPlugin | IPluginHooks): boolean;
  unregister(name: string): boolean;
  getPlugin(name: string): IPlugin | null;
  getAllPlugins(): IPlugin[];
  enablePlugin(name: string): boolean;
  disablePlugin(name: string): boolean;
  applyHook<T>(hookName: keyof IPluginHooks, data: T): Promise<T | false>;
}
