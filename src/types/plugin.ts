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
   * 可视化前钩子
   */
  beforeVisualize?: (data: unknown) => unknown | false;

  /**
   * 可视化后钩子
   */
  afterVisualize?: (chart: unknown, data: unknown) => void;

  /**
   * 初始化完成钩子
   */
  onInitialized?: () => void | Promise<void>;

  /**
   * 页面卸载钩子
   */
  onUnload?: () => void | Promise<void>;

  /**
   * 路由变更钩子
   */
  onRouteChange?: (from: string, to: string) => void;

  /**
   * 资源加载钩子
   */
  onResourceLoad?: (resource: PerformanceResourceTiming) => void;

  /**
   * 性能条目观察钩子
   */
  onPerformanceEntry?: (entry: PerformanceEntry) => void;

  /**
   * 网络状态变更钩子
   */
  onNetworkStatusChange?: (online: boolean) => void;

  /**
   * 自定义事件钩子
   */
  onCustomEvent?: (eventName: string, data: unknown) => void;

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
  priority?: number;
  dependencies?: string[];
  requiresConfig?: boolean;
  [key: string]: unknown;
}

/**
 * 插件元数据
 */
export interface IPluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  category?: string;
}

/**
 * 插件接口
 */
export interface IPlugin<T = unknown> {
  name: string;
  version: string;
  hooks: IPluginHooks<T>;
  config: IPluginConfig;
  metadata?: IPluginMetadata;
  init(config?: unknown): Promise<boolean>;
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  destroy(): Promise<void>;
  getApi(): Record<string, unknown>;
  getEvents(): string[];
  emit(eventName: string, data: unknown): void;
  on(eventName: string, handler: (data: unknown) => void): () => void;
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
  registerApi(name: string, api: Record<string, unknown>): boolean;
  getApi(name: string): Record<string, unknown> | null;
  loadPlugin(url: string): Promise<boolean>;
  installPlugin(plugin: IPlugin): Promise<boolean>;
  getDependencies(name: string): string[];
  getPluginsByCategory(category: string): IPlugin[];
  getPluginsByTag(tag: string): IPlugin[];
  resolveDependencyGraph(): boolean;
  emitEvent(eventName: string, data: unknown): void;
  subscribeToEvent(eventName: string, handler: (data: unknown) => void): () => void;
}

/**
 * 插件存储接口
 */
export interface IPluginStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): boolean;
  remove(key: string): boolean;
  clear(): void;
  getNamespace(): string;
}

/**
 * 内置插件IDs
 */
export enum BuiltInPluginId {
  MEMORY_MONITOR = 'memory-monitor',
  REACT_PROFILER = 'react-profiler',
  SOURCE_MAP = 'source-map',
  SESSION_RECORDER = 'session-recorder',
  NETWORK_MONITOR = 'network-monitor',
  USER_TIMING = 'user-timing',
  ERROR_BOUNDARY = 'error-boundary',
  CONSOLE_LOGGER = 'console-logger',
}
