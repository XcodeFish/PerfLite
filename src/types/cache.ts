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
export interface IMemoryCache<T = unknown> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): boolean;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  keys(): string[];
  getStats(): IMemoryCacheStats;
  prune(): number;
  setMaxSize(size: number): void;
  updateTTL(key: string, ttl: number): boolean;
  setPriority(key: string, priority: number): boolean;
  getOldestItem(): ICacheItem<T> | null;
  getNewestItem(): ICacheItem<T> | null;
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
  get<T>(key: string): Promise<T | null>;
  getSync<T>(key: string): T | null;
  set<T>(
    key: string,
    value: T,
    options?: {
      memoryOnly?: boolean;
      ttl?: number;
      priority?: number;
      compress?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  preCacheFrameworks(frameworks: string[]): Promise<void>;
  getStats(): Promise<{ memory: IMemoryCacheStats; storage: IStorageStats }>;
  exportCache(): Promise<string>;
  importCache(data: string): Promise<boolean>;
  setStrategy(strategy: 'lru' | 'fifo' | 'lfu'): void;
  optimize(): Promise<void>;
  subscribe(callback: (event: ICacheEvent) => void): () => void;
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
