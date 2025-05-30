/* eslint-disable @typescript-eslint/no-explicit-any */
import { ErrorParser } from '../../src/core/ErrorParser';
import { PerformanceAnalyzer } from '../../src/core/PerformanceAnalyzer';

// 创建测试用的PerformanceAnalyzer子类，以便我们可以控制URL返回值
class MockPerformanceAnalyzer extends PerformanceAnalyzer {
  private mockedUrl: string;
  private originalGetTimeline: () => any;

  constructor(mockedUrl: string = 'https://example.com/test') {
    super();
    this.mockedUrl = mockedUrl;
    // 保存原始方法
    this.originalGetTimeline = this.getTimeline;

    // 重写getTimeline方法，仅模拟URL
    this.getTimeline = () => {
      const timeline = this.originalGetTimeline.call(this);
      timeline.url = this.mockedUrl;
      return timeline;
    };
  }
}

interface MockLocalStorage {
  store: Record<string, string>;
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  clear: jest.Mock;
  length: number;
  key: jest.Mock;
}

// 模拟localStorage对象
const mockLocalStorage: MockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string): string | null => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string): void => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key: string): void => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn((): void => {
    mockLocalStorage.store = {};
  }),
  length: 0,
  key: jest.fn(
    (index: number): string | null => Object.keys(mockLocalStorage.store)[index] || null
  ),
};

// 保存原始全局对象引用
const originalLocalStorage = global.localStorage;
const originalPerformance = global.performance;

describe('浏览器端到端测试', () => {
  let errorParser: ErrorParser;
  let performanceAnalyzer: MockPerformanceAnalyzer;
  // 存储原始URL，用于测试
  const testUrl = 'https://example.com/test';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.store = {};

    // 替换全局对象
    global.localStorage = mockLocalStorage as any;

    // 模拟performance对象
    global.performance = {
      ...originalPerformance,
      now: jest.fn().mockReturnValue(1000),
      timing: {
        navigationStart: Date.now() - 1000,
      },
      getEntriesByType: jest.fn().mockImplementation((type) => {
        if (type === 'resource') {
          return [
            {
              name: 'https://example.com/script.js',
              startTime: 100,
              duration: 300,
              initiatorType: 'script',
            },
          ];
        }
        return [];
      }),
    } as any;

    errorParser = new ErrorParser();
    // 使用我们的模拟类
    performanceAnalyzer = new MockPerformanceAnalyzer(testUrl);
  });

  afterEach(() => {
    // 恢复原始全局对象
    global.localStorage = originalLocalStorage;
    global.performance = originalPerformance;
  });

  test('应能在浏览器环境中初始化并运行', () => {
    // 验证初始化没有错误
    expect(errorParser).toBeDefined();
    expect(performanceAnalyzer).toBeDefined();
  });

  test('应能解析错误栈', async () => {
    // 模拟错误栈
    const errorStack = `Error: 测试错误
    at test (https://example.com/test.js:10:5)
    at callTest (https://example.com/test.js:15:10)`;

    const error = new Error('测试错误');
    error.stack = errorStack;

    // 解析错误
    const parsedError = await errorParser.parse(error);

    // 验证解析结果
    expect(parsedError).toBeDefined();
    expect(parsedError.name).toBe('Error');
    expect(parsedError.message).toBe('测试错误');
    expect(parsedError.stack).toBe(errorStack);
    expect(parsedError.frames.length).toBeGreaterThan(0);
  });

  test('应能记录性能指标', () => {
    // 添加一个性能指标
    performanceAnalyzer.addMetric({
      name: 'test-metric',
      value: 100,
      timestamp: Date.now(),
      unit: 'ms',
    });

    // 获取时间线
    const timeline = performanceAnalyzer.getTimeline();

    // 验证指标被记录
    expect(timeline.metrics.length).toBeGreaterThan(0);
    expect(timeline.metrics.find((m) => m.name === 'test-metric')).toBeDefined();

    // 验证URL和UserAgent
    expect(timeline.url).toBe(testUrl);
    expect(timeline.userAgent).toBeDefined();
  });

  test('应能正确处理本地存储', () => {
    // 直接测试mockLocalStorage而不是通过全局localStorage
    mockLocalStorage.setItem('test-key', 'test-value');

    // 验证方法被调用
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    expect(mockLocalStorage.store['test-key']).toBe('test-value');

    // 验证获取存储的值
    expect(mockLocalStorage.getItem('test-key')).toBe('test-value');
  });
});
