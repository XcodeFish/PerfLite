import { MemoryCache } from '../../src/cache/memory';

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>(3, 500); // 最大3项，TTL 500ms
  });

  test('应正确存储和检索值', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    expect(cache.has('key1')).toBe(true);
  });

  test('应返回非存在键的undefined', () => {
    expect(cache.get('nonexistent')).toBe(undefined);
    expect(cache.has('nonexistent')).toBe(false);
  });

  test('应正确删除键', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.has('key1')).toBe(false);
    expect(cache.get('key1')).toBe(undefined);

    // 测试删除不存在的键
    expect(cache.delete('nonexistent')).toBe(false);
  });

  test('应正确清除所有缓存', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  test('应在超过最大容量时淘汰最旧项', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    expect(cache.size()).toBe(3);

    // 添加第四项，最旧的应被淘汰
    cache.set('key4', 'value4');
    expect(cache.size()).toBe(3);
    expect(cache.has('key1')).toBe(false); // key1应被淘汰
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  test('缓存项应该在TTL后过期', async () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);

    // 等待超过TTL
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(cache.has('key1')).toBe(false);
    expect(cache.get('key1')).toBe(undefined);
  });
});
