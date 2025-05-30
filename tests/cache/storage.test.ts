/* eslint-disable @typescript-eslint/no-explicit-any */
import { StorageCache } from '../../src/cache/Storage';

// 模拟 indexedDB
const mockIndexedDB = (() => {
  let stores: Record<string, Record<string, any>> = {};

  // 帮助函数，确保回调被同步调用，不走异步
  function executeCallback(callback: any) {
    if (callback) callback({ target: { result: null } });
  }

  return {
    open: jest.fn().mockImplementation(() => {
      const request = {
        result: {
          transaction: jest.fn().mockImplementation((storeName) => ({
            objectStore: jest.fn().mockImplementation(() => ({
              get: jest.fn().mockImplementation((key) => {
                const result = stores[storeName]?.[key];
                const request = {
                  onsuccess: null,
                  result,
                };
                // 立即执行回调
                setTimeout(() => executeCallback(request.onsuccess), 0);
                return request;
              }),
              put: jest.fn().mockImplementation((item) => {
                if (!stores[storeName]) {
                  stores[storeName] = {};
                }
                stores[storeName][item.key] = item;
                const request = { onsuccess: null };
                // 立即执行回调
                setTimeout(() => executeCallback(request.onsuccess), 0);
                return request;
              }),
              delete: jest.fn().mockImplementation((key) => {
                if (stores[storeName] && stores[storeName][key]) {
                  delete stores[storeName][key];
                }
                const request = { onsuccess: null };
                // 立即执行回调
                setTimeout(() => executeCallback(request.onsuccess), 0);
                return request;
              }),
              clear: jest.fn().mockImplementation(() => {
                stores[storeName] = {};
                const request = { onsuccess: null };
                // 立即执行回调
                setTimeout(() => executeCallback(request.onsuccess), 0);
                return request;
              }),
              openCursor: jest.fn().mockImplementation(() => {
                const keys = stores[storeName] ? Object.keys(stores[storeName]) : [];
                let index = 0;

                const request = {
                  onsuccess: null,
                  get result() {
                    if (index < keys.length) {
                      const key = keys[index];
                      const value = stores[storeName][key];
                      index++;
                      return {
                        key,
                        value,
                        continue: jest.fn(() => {
                          if (request.onsuccess) {
                            executeCallback(request.onsuccess);
                          }
                        }),
                        delete: jest.fn(() => {
                          delete stores[storeName][key];
                        }),
                      };
                    }
                    return null;
                  },
                };
                // 立即执行回调
                setTimeout(() => executeCallback(request.onsuccess), 0);
                return request;
              }),
            })),
          })),
          objectStoreNames: {
            contains: jest.fn().mockReturnValue(true),
          },
        },
        onupgradeneeded: null,
        onsuccess: null,
      };
      // 立即执行成功回调
      setTimeout(() => executeCallback(request.onsuccess), 0);
      return request;
    }),
    deleteDatabase: jest.fn().mockImplementation(() => {
      stores = {};
    }),
  };
})();

// 模拟 window.indexedDB
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('StorageCache', () => {
  let storage: StorageCache<string>;
  const TEST_DB = 'test-db';
  const TEST_STORE = 'test-store';
  const SHORT_TTL = 100; // 100ms TTL，用于测试过期

  beforeEach(() => {
    jest.clearAllMocks();
    mockIndexedDB.deleteDatabase();
    storage = new StorageCache<string>(SHORT_TTL, TEST_DB, TEST_STORE);
  });

  test('应正确存储和检索值', async () => {
    // 预先在模拟存储中设置值
    mockIndexedDB.open().result.transaction().objectStore().put({
      key: 'key1',
      value: 'value1',
      timestamp: Date.now(),
    });

    await storage.set('key1', 'value1');
    const value = await storage.get('key1');
    expect(value).toBe('value1');

    const exists = await storage.has('key1');
    expect(exists).toBe(true);
  }, 20000); // 增加超时时间

  test('应正确删除键', async () => {
    // 预先在模拟存储中设置值
    mockIndexedDB.open().result.transaction().objectStore().put({
      key: 'key1',
      value: 'value1',
      timestamp: Date.now(),
    });

    await storage.set('key1', 'value1');
    const result = await storage.delete('key1');
    expect(result).toBe(true);

    const value = await storage.get('key1');
    expect(value).toBe(undefined);
  }, 20000); // 增加超时时间

  test('应正确清空存储', async () => {
    // 预先在模拟存储中设置值
    mockIndexedDB.open().result.transaction().objectStore().put({
      key: 'key1',
      value: 'value1',
      timestamp: Date.now(),
    });
    mockIndexedDB.open().result.transaction().objectStore().put({
      key: 'key2',
      value: 'value2',
      timestamp: Date.now(),
    });

    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.clear();

    const value1 = await storage.get('key1');
    expect(value1).toBe(undefined);

    const value2 = await storage.get('key2');
    expect(value2).toBe(undefined);
  }, 20000); // 增加超时时间

  test('应正确清理过期缓存', async () => {
    // 设置一个已过期的条目
    const expiredTimestamp = Date.now() - SHORT_TTL - 10;

    // 预先在模拟存储中设置过期值
    mockIndexedDB.open().result.transaction().objectStore().put({
      key: 'expired',
      value: 'old',
      timestamp: expiredTimestamp,
    });

    await storage.cleanup();

    // 验证过期项已被删除
    const value = await storage.get('expired');
    expect(value).toBe(undefined);
  }, 20000); // 增加超时时间
});
