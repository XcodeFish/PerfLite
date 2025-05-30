/**
 * 基于IndexedDB的持久化存储缓存实现
 */
export class StorageCache<T> {
  private dbName: string;
  private storeName: string;
  private ttl: number; // 过期时间（毫秒）
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    ttl: number = 86400000,
    dbName: string = 'perflite-cache',
    storeName: string = 'cache-store'
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.ttl = ttl;
  }

  /**
   * 获取缓存项
   */
  public async get(key: string): Promise<T | undefined> {
    const db = await this.openDatabase();
    return new Promise<T | undefined>((resolve) => {
      try {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const data = request.result;
          if (!data) {
            resolve(undefined);
            return;
          }

          // 检查是否过期
          if (Date.now() - data.timestamp > this.ttl) {
            this.delete(key); // 过期则删除
            resolve(undefined);
            return;
          }

          resolve(data.value as T);
        };

        request.onerror = () => {
          console.error('从IndexedDB获取数据失败:', request.error);
          resolve(undefined);
        };
      } catch (error) {
        console.error('IndexedDB操作失败:', error);
        resolve(undefined);
      }
    });
  }

  /**
   * 设置缓存项
   */
  public async set(key: string, value: T): Promise<void> {
    const db = await this.openDatabase();
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({
          key,
          value,
          timestamp: Date.now(),
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error('IndexedDB操作失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 检查缓存项是否存在
   */
  public async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * 删除缓存项
   */
  public async delete(key: string): Promise<boolean> {
    const db = await this.openDatabase();
    return new Promise<boolean>((resolve) => {
      try {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.error('从IndexedDB删除数据失败:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('IndexedDB操作失败:', error);
        resolve(false);
      }
    });
  }

  /**
   * 清空指定前缀的缓存
   */
  public async clear(prefix?: string): Promise<void> {
    const db = await this.openDatabase();
    return new Promise<void>((resolve) => {
      try {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        if (!prefix) {
          // 清空所有缓存
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => {
            console.error('清空IndexedDB失败:', request.error);
            resolve();
          };
        } else {
          // 仅清空指定前缀的缓存
          const request = store.openCursor();
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              const key = cursor.key as string;
              if (key.startsWith(prefix)) {
                cursor.delete();
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => {
            console.error('IndexedDB游标操作失败:', request.error);
            resolve();
          };
        }
      } catch (error) {
        console.error('IndexedDB操作失败:', error);
        resolve();
      }
    });
  }

  /**
   * 打开数据库连接
   */
  private async openDatabase(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error('当前浏览器不支持IndexedDB'));
          return;
        }

        const request = window.indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  /**
   * 清理过期缓存
   */
  public async cleanup(): Promise<void> {
    const db = await this.openDatabase();
    return new Promise<void>((resolve) => {
      try {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.openCursor();
        const now = Date.now();

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const data = cursor.value;
            if (now - data.timestamp > this.ttl) {
              cursor.delete(); // 删除过期数据
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          console.error('清理过期缓存失败:', request.error);
          resolve();
        };
      } catch (error) {
        console.error('IndexedDB操作失败:', error);
        resolve();
      }
    });
  }
}
