/**
 * 缓存项类型
 */
export interface ICacheItem<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size?: number;
  lastAccessed?: number;
  metadata?: Record<string, unknown>;
  priority?: number;
  compressed?: boolean;
}

/**
 * 内存缓存接口
 */
export interface IMemoryCache<T> {
  /**
   * 获取缓存项
   */
  get(key: string): T | undefined;

  /**
   * 设置缓存项
   */
  set(key: string, value: T): void;

  /**
   * 检查缓存项是否存在
   */
  has(key: string): boolean;

  /**
   * 删除缓存项
   */
  delete(key: string): boolean;

  /**
   * 清空缓存
   */
  clear(): void;

  /**
   * 获取缓存大小
   */
  size(): number;
}

/**
 * 内存缓存统计信息
 */
export interface IMemoryCacheStats {
  size: number;
  count: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestTimestamp?: number;
  newestTimestamp?: number;
  averageAge?: number;
  memoryUsage?: number;
  evictions?: number;
}

/**
 * 持久化存储接口
 */
export interface IStorage<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<boolean>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
  getStats(): Promise<IStorageStats>;
  setMaxSize(size: number): Promise<void>;
  compact(): Promise<number>;
  exportData(): Promise<Record<string, ICacheItem<T>>>;
  importData(data: Record<string, ICacheItem<T>>): Promise<number>;
}

/**
 * 持久化存储统计信息
 */
export interface IStorageStats {
  size: number;
  count: number;
  oldestItem?: ICacheItem<unknown>;
  newestItem?: ICacheItem<unknown>;
  averageSize?: number;
  compressionRatio?: number;
  availableSpace?: number;
  lastCompaction?: number;
}

/**
 * 缓存系统接口
 */
export interface ICacheSystem {
  /**
   * 获取缓存项
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * 设置缓存项
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * 检查缓存项是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 删除缓存项
   */
  delete(key: string): Promise<boolean>;

  /**
   * 清空缓存
   */
  clear(): Promise<void>;
}

/**
 * 缓存事件类型
 */
export interface ICacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'evict' | 'error';
  key?: string;
  source: 'memory' | 'storage';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 存储缓存接口
 */
export interface IStorageCache<T> {
  /**
   * 获取缓存项
   */
  get(key: string): Promise<T | undefined>;

  /**
   * 设置缓存项
   */
  set(key: string, value: T): Promise<void>;

  /**
   * 检查缓存项是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 删除缓存项
   */
  delete(key: string): Promise<boolean>;

  /**
   * 清空缓存
   */
  clear(prefix?: string): Promise<void>;

  /**
   * 清理过期缓存
   */
  cleanup(): Promise<void>;
}
