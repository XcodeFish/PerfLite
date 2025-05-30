/**
 * 缓存系统入口
 */
import { MemoryCache } from './memory';
import { StorageCache } from './storage';

export { MemoryCache, StorageCache };

/**
 * 缓存管理器，统一管理内存缓存和持久化存储
 */
export class CacheManager<T> {
  private memoryCache: MemoryCache<T>;
  private storageCache: StorageCache<T>;
  private keyPrefix: string;

  constructor(
    keyPrefix: string = 'perflite',
    memoryCacheSize: number = 50,
    memoryCacheTTL: number = 300000, // 5分钟
    storageCacheTTL: number = 86400000 // 24小时
  ) {
    this.keyPrefix = keyPrefix;
    this.memoryCache = new MemoryCache<T>(memoryCacheSize, memoryCacheTTL);
    this.storageCache = new StorageCache<T>(storageCacheTTL);
  }

  /**
   * 获取缓存项，优先从内存缓存获取，如果没有则从持久化存储获取
   */
  public async get(key: string): Promise<T | undefined> {
    const cacheKey = `${this.keyPrefix}:${key}`;
    // 先尝试从内存缓存获取
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem !== undefined) {
      return memoryItem;
    }

    // 尝试从持久化存储获取
    const storageItem = await this.storageCache.get(cacheKey);
    if (storageItem !== undefined) {
      // 将数据加入内存缓存
      this.memoryCache.set(cacheKey, storageItem);
      return storageItem;
    }

    return undefined;
  }

  /**
   * 设置缓存项，同时更新内存缓存和持久化存储
   */
  public async set(key: string, value: T): Promise<void> {
    const cacheKey = `${this.keyPrefix}:${key}`;
    // 更新内存缓存
    this.memoryCache.set(cacheKey, value);
    // 更新持久化存储
    await this.storageCache.set(cacheKey, value);
  }

  /**
   * 检查缓存项是否存在
   */
  public async has(key: string): Promise<boolean> {
    const cacheKey = `${this.keyPrefix}:${key}`;
    // 先检查内存缓存
    if (this.memoryCache.has(cacheKey)) {
      return true;
    }
    // 再检查持久化存储
    return await this.storageCache.has(cacheKey);
  }

  /**
   * 删除缓存项
   */
  public async delete(key: string): Promise<boolean> {
    const cacheKey = `${this.keyPrefix}:${key}`;
    // 删除内存缓存
    this.memoryCache.delete(cacheKey);
    // 删除持久化存储
    return await this.storageCache.delete(cacheKey);
  }

  /**
   * 清空所有缓存
   */
  public async clear(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.clear();
    // 清空持久化存储
    await this.storageCache.clear(this.keyPrefix);
  }
}

// 导出默认缓存管理器实例
export const cacheManager = new CacheManager();
