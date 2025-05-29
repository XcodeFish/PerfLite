// src/utils/cache.ts

import LRUCache from 'lru-cache';

// 创建LRU缓存实例，容量为1000条，最大存活时间为1小时
const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1小时
});

/**
 * 检查缓存中是否存在指定的键
 * @param key - 缓存键
 * @returns 是否存在
 */
export const cacheHas = (key: string): boolean => {
  return cache.has(key);
};

/**
 * 从缓存中获取值
 * @param key - 缓存键
 * @returns 缓存的值
 */
export const cacheGet = (key: string): any => {
  return cache.get(key);
};

/**
 * 将值存入缓存
 * @param key - 缓存键
 * @param value - 要缓存的值
 */
export const cacheSet = (key: string, value: any): void => {
  cache.set(key, value);
};

/**
 * 从缓存中删除值
 * @param key - 缓存键
 */
export const cacheRemove = (key: string): void => {
  cache.delete(key);
};

/**
 * 清空整个缓存
 */
export const cacheClear = (): void => {
  cache.clear();
};

export default {
  has: cacheHas,
  get: cacheGet,
  set: cacheSet,
  remove: cacheRemove,
  clear: cacheClear,
};
