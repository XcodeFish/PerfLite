/**
 * WASM解析器单元测试
 * 测试WebAssembly解析器的功能和性能
 */
import { WasmParser, wasmParser } from '../../src/parser/wasm';
import { WasmLoader } from '../../src/parser/wasm/loader';

// 模拟WebAssembly环境
const mockWasmInstance = {
  exports: {
    init_parser: jest.fn(),
    init_simd_parser: jest.fn(),
    parse: jest.fn().mockReturnValue(
      JSON.stringify([
        {
          function_name: 'functionA',
          file_name: 'file1.js',
          line_number: 1,
          column_number: 10,
        },
        {
          function_name: 'functionB',
          file_name: 'file2.js',
          line_number: 2,
          column_number: 20,
        },
      ])
    ),
    parse_stack_simd: jest.fn().mockReturnValue(
      JSON.stringify([
        {
          function_name: 'functionA',
          file_name: 'file1.js',
          line_number: 1,
          column_number: 10,
        },
        {
          function_name: 'functionB',
          file_name: 'file2.js',
          line_number: 2,
          column_number: 20,
        },
      ])
    ),
    has_simd_support: jest.fn().mockReturnValue(true),
  },
};

// 在测试前为全局对象添加mock
beforeAll(() => {
  // 模拟WebAssembly
  (global as any).WebAssembly = {
    instantiate: jest.fn().mockResolvedValue({ instance: mockWasmInstance }),
    Memory: jest.fn().mockImplementation(() => ({
      buffer: new ArrayBuffer(1024),
    })),
    compile: jest.fn(),
    compileStreaming: jest.fn(),
    instantiateStreaming: jest.fn(),
    validate: jest.fn().mockReturnValue(true),
  };

  // 模拟fetch API
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  });
});

describe('WASM Parser', () => {
  let parser: WasmParser;

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置WasmLoader单例的状态
    (WasmLoader as any).instance = undefined;

    // 创建一个新的解析器实例
    parser = new WasmParser('/mock/path/parser.wasm', '/mock/path/parser_no_simd.wasm');

    // 模拟SIMD支持
    jest.spyOn(WasmLoader.prototype, 'checkSimdSupport').mockResolvedValue(true);
    jest.spyOn(WasmLoader.prototype, 'supportsSimd').mockReturnValue(true);

    // 直接给loader实例注入mock的WASM实例
    (parser as any).loader.wasmInstance = mockWasmInstance;
  });

  /**
   * 测试WASM解析器初始化
   */
  test('解析器初始化', async () => {
    const initResult = await parser.initialize();
    expect(initResult).toBe(true);
  });

  /**
   * 测试SIMD支持检测
   */
  test('检测SIMD支持', async () => {
    await parser.initialize();
    expect(parser['loader'].supportsSimd()).toBe(true);
  });

  /**
   * 测试SIMD不支持时的降级
   */
  test('SIMD不支持时降级', async () => {
    // 模拟SIMD不支持
    jest.spyOn(WasmLoader.prototype, 'supportsSimd').mockReturnValue(false);
    jest.spyOn(WasmLoader.prototype, 'checkSimdSupport').mockResolvedValue(false);

    await parser.initialize();
    expect(parser['loader'].supportsSimd()).toBe(false);
  });

  /**
   * 测试解析简单错误堆栈的能力
   */
  test('解析简单堆栈', async () => {
    const simpleStack = `Error: Simple error
      at functionA (file1.js:1:10)
      at functionB (file2.js:2:20)`;

    await parser.initialize();
    const result = await parser.parseStack(simpleStack);

    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe('file1.js');
    expect(result[0].lineNumber).toBe(1);
  });

  /**
   * 测试处理格式不规范的错误堆栈
   */
  test('处理畸形堆栈', async () => {
    const malformedStack = `Error: Malformed
      Bad stack line
      at functionName (no parentheses)`;

    await parser.initialize();
    const result = await parser.parseStack(malformedStack);

    // 即使输入畸形也应该返回某些结果
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  /**
   * 测试WASM未初始化时自动初始化
   */
  test('未初始化时自动初始化', async () => {
    const stack = `Error: Auto-init test
      at functionA (file1.js:1:10)
      at functionB (file2.js:2:20)`;

    // 不预先调用initialize()
    const result = await parser.parseStack(stack);

    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
  });

  /**
   * 测试多次初始化
   */
  test('多次初始化只加载一次WASM', async () => {
    // 监视loader.loadModule方法
    const loadModuleSpy = jest.spyOn(parser['loader'], 'loadModule');

    await parser.initialize();
    await parser.initialize();
    await parser.initialize();

    // loadModule应该只被调用一次
    expect(loadModuleSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * 测试并发解析
   */
  test('并发解析多个错误栈', async () => {
    await parser.initialize();

    const stack1 = `Error: Test error 1
    at fn1 (file1.js:10:20)`;

    const stack2 = `Error: Test error 2
    at fn2 (file2.js:30:40)`;

    const stack3 = `Error: Test error 3
    at fn3 (file3.js:50:60)`;

    // 并发解析
    const results = await Promise.all([
      parser.parseStack(stack1),
      parser.parseStack(stack2),
      parser.parseStack(stack3),
    ]);

    // 验证所有请求都得到了处理
    expect(results.length).toBe(3);
    results.forEach((frames) => {
      expect(Array.isArray(frames)).toBe(true);
    });
  });

  /**
   * 测试WASM加载失败时降级到JavaScript解析
   */
  test('WASM加载失败时降级到JS解析', async () => {
    // 临时存储原始的mock实现
    const originalMock = parser['loader'];

    // 模拟loader.loadModule方法返回null
    jest.spyOn(parser['loader'], 'loadModule').mockResolvedValueOnce(null);

    const stack = `Error: Fallback test
      at functionA (file1.js:1:10)
      at functionB (file2.js:2:20)`;

    const result = await parser.parseStack(stack);

    // 即使WASM加载失败，也应返回JavaScript解析结果
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    // 恢复原始实现
    parser['loader'] = originalMock;
  });

  /**
   * 性能基准测试 - 标准模式
   */
  test('[性能] 标准模式解析性能 - 15ms', async () => {
    // 确保使用标准模式
    jest.spyOn(parser['loader'], 'supportsSimd').mockReturnValue(false);
    await parser.initialize();

    const largeStack = Array(100)
      .fill(null)
      .map((_, i) => `at function${i} (file${i}.js:${i}:${i * 10})`)
      .join('\n');

    const start = Date.now();
    await parser.parseStack(largeStack);
    const end = Date.now();

    expect(end - start).toBeLessThan(15);
  });

  /**
   * 性能基准测试 - SIMD模式
   */
  test('[性能] SIMD模式解析性能 - 10ms', async () => {
    // 确保使用SIMD模式
    jest.spyOn(parser['loader'], 'supportsSimd').mockReturnValue(true);
    await parser.initialize();

    const largeStack = Array(100)
      .fill(null)
      .map((_, i) => `at function${i} (file${i}.js:${i}:${i * 10})`)
      .join('\n');

    const start = Date.now();
    await parser.parseStack(largeStack);
    const end = Date.now();

    // SIMD模式应该比标准模式更快
    expect(end - start).toBeLessThan(10);
  });

  /**
   * 测试解析异常处理
   */
  test('处理解析过程中的异常', async () => {
    await parser.initialize();

    // 临时保存原来的mock实现
    const originalParse = mockWasmInstance.exports.parse;

    // 模拟解析函数抛出异常
    mockWasmInstance.exports.parse = jest.fn().mockImplementationOnce(() => {
      throw new Error('WASM解析错误');
    });

    const stack = `Error: Test error
    at fn (file.js:10:20)`;

    // 应该正常返回结果，不抛出异常
    const frames = await parser.parseStack(stack);

    // 降级到JavaScript解析，应该有结果
    expect(frames).toBeDefined();
    expect(Array.isArray(frames)).toBe(true);

    // 恢复原来的mock实现
    mockWasmInstance.exports.parse = originalParse;
  });

  /**
   * 默认导出实例测试
   */
  test('默认实例可用', async () => {
    expect(wasmParser).toBeInstanceOf(WasmParser);

    const stack = `Error: Default instance test
      at functionA (file1.js:1:10)`;

    const result = await wasmParser.parseStack(stack);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
