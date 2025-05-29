/**
 * 缓存项类型
 */
export interface ICacheItem<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size?: number;
}

/**
 * 内存缓存接口
 */
export interface IMemoryCache<T = unknown> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): boolean;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  keys(): string[];
  getStats(): IMemoryCacheStats;
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
}

/**
 * 持久化存储统计信息
 */
export interface IStorageStats {
  size: number;
  count: number;
  oldestItem?: ICacheItem<unknown>;
  newestItem?: ICacheItem<unknown>;
}

/**
 * 缓存系统接口
 */
export interface ICacheSystem {
  get<T>(key: string): Promise<T | null>;
  getSync<T>(key: string): T | null;
  set<T>(key: string, value: T, options?: { memoryOnly?: boolean; ttl?: number }): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  preCacheFrameworks(frameworks: string[]): Promise<void>;
  getStats(): Promise<{ memory: IMemoryCacheStats; storage: IStorageStats }>;
}
