import { DeepSeek } from '../../src/parser/deepseek';
import { DeepSeekClient } from '../../src/parser/deepseek/client';

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

// 将模拟的 localStorage 分配给全局 localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

jest.mock('../../src/parser/deepseek/client');

describe('DeepSeek解析器', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('应正确初始化默认选项', () => {
    const deepseek = new DeepSeek();
    const options = deepseek.getOptions();

    expect(options.enable).toBe(true);
    expect(options.fallback).toBe('local');
    expect(options.rateLimit).toBe(1);
    expect(options.quotaMode).toBe('economy');
    expect(options.model).toBe('deepseek-v3-community');
  });

  test('应正确合并自定义选项', () => {
    const customOptions = {
      apiKey: 'test-key',
      enable: false,
      quotaMode: 'standard' as const,
    };

    const deepseek = new DeepSeek(customOptions);
    const options = deepseek.getOptions();

    expect(options.apiKey).toBe('test-key');
    expect(options.enable).toBe(false);
    expect(options.quotaMode).toBe('standard');
    // 默认选项应保持不变
    expect(options.fallback).toBe('local');
    expect(options.rateLimit).toBe(1);
  });

  test('应正确更新选项', () => {
    const deepseek = new DeepSeek();
    deepseek.updateOptions({ enable: false, rateLimit: 0.5 });

    const options = deepseek.getOptions();
    expect(options.enable).toBe(false);
    expect(options.rateLimit).toBe(0.5);
    // 其他选项应保持不变
    expect(options.fallback).toBe('local');
  });

  test('禁用时应抛出错误', async () => {
    const deepseek = new DeepSeek({ enable: false });

    await expect(deepseek.parseError('Error: test')).rejects.toThrow('DeepSeek API is disabled');
  });

  test('API调用计数应正确增加', async () => {
    // 模拟客户端方法
    (DeepSeekClient.prototype.parseError as jest.Mock).mockResolvedValue({
      message: 'Test error',
      name: 'Error',
      stack: 'Error: Test error',
      timestamp: Date.now(),
      type: 'unknown',
      parsedStack: [],
      frames: [],
      source: 'deepseek',
    });

    const deepseek = new DeepSeek();
    expect(deepseek.getApiCallCount()).toBe(0);

    await deepseek.parseError('Error: Test');
    expect(deepseek.getApiCallCount()).toBe(1);

    await deepseek.parseError('Error: Another test');
    expect(deepseek.getApiCallCount()).toBe(2);
  });

  test('API限额检查应正常工作', async () => {
    const deepseek = new DeepSeek();

    // 修改内部的apiCallCounter以触发限额
    const limit = deepseek.getApiCallLimit();

    // 手动设置计数超过限额
    for (let i = 0; i < limit; i++) {
      localStorageMock.setItem('deepseek_api_count', String(limit)); // 直接设置为限额
    }

    // 重新加载计数器以应用设置
    deepseek['loadApiCounter']();

    // 检查计数是否正确设置
    expect(deepseek.getApiCallCount()).toBe(limit);

    // 此时API调用应该失败并抛出异常
    await expect(deepseek.parseError('Error: test')).rejects.toThrow(
      'DeepSeek API daily limit reached'
    );
  });
});
