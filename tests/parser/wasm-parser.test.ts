/**
 * WASM解析器组件的单元测试
 * 测试WASM错误堆栈解析功能的正确性和性能
 */
import { WasmParser } from '../../src/parser/wasm';

describe('WasmParser', () => {
  let wasmParser: WasmParser;
  let isWasmAvailable = false;

  // 在所有测试之前检查WASM支持状态
  beforeAll(async () => {
    try {
      const tempParser = new WasmParser();
      isWasmAvailable = await tempParser.initialize();

      if (!isWasmAvailable) {
        console.info('WASM不可用，测试将使用JS回退实现');
      } else {
        console.info('WASM可用，将使用WASM进行测试');
      }
    } catch {
      console.info('WASM初始化出错，测试将使用JS回退实现');
      isWasmAvailable = false;
    }
  });

  beforeEach(() => {
    wasmParser = new WasmParser();
    // 不在beforeEach中初始化，避免每个测试都产生错误日志
  });

  test('should initialize correctly and report WASM support status', async () => {
    const initResult = await wasmParser.initialize();

    // 验证初始化结果与全局检测一致
    expect(typeof initResult).toBe('boolean');
    expect(initResult).toBe(isWasmAvailable);

    // 无论WASM是否可用，初始化应该不会抛出错误
    expect(async () => {
      await wasmParser.initialize();
    }).not.toThrow();
  });

  test('should parse simple error stack correctly', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const stack = `Error: Test error
        at functionName (file.js:10:5)
        at anotherFunction (file.js:15:10)`;

    const result = await wasmParser.parseStackAsync(stack);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].functionName).toBe('functionName');
    expect(result[0].fileName).toBe('file.js');
    expect(result[0].lineNumber).toBe(10);
    expect(result[0].columnNumber).toBe(5);
  });

  test('should handle empty stack gracefully', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const result = await wasmParser.parseStackAsync('');
    expect(result).toEqual([]);
  });

  test('should handle malformed stack gracefully', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const malformedStack = 'This is not a proper stack trace';
    const result = await wasmParser.parseStackAsync(malformedStack);
    expect(result).toBeDefined();
    // 由于不是有效的堆栈，应该返回空数组或至少不抛出错误
    expect(Array.isArray(result)).toBe(true);
  });

  test('should parse Firefox format stack correctly', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const firefoxStack = `functionName@file.js:10:5
        anotherFunction@file.js:15:10`;

    const result = await wasmParser.parseStackAsync(firefoxStack);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    // 具体格式匹配检查需要根据实际实现调整
  });

  test('should parse multiple frames correctly', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const multiFrameStack = `Error: Multi-frame test
        at frame1 (file1.js:10:5)
        at frame2 (file2.js:20:10)
        at frame3 (file3.js:30:15)`;

    const result = await wasmParser.parseStackAsync(multiFrameStack);
    expect(result).toBeDefined();
    expect(result.length).toBe(3);

    expect(result[0].functionName).toBe('frame1');
    expect(result[0].fileName).toBe('file1.js');
    expect(result[0].lineNumber).toBe(10);

    expect(result[1].functionName).toBe('frame2');
    expect(result[1].fileName).toBe('file2.js');
    expect(result[1].lineNumber).toBe(20);

    expect(result[2].functionName).toBe('frame3');
    expect(result[2].fileName).toBe('file3.js');
    expect(result[2].lineNumber).toBe(30);
  });

  test('should handle file paths with colons correctly', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const stackWithColonPath = `Error: Path with colon
        at func (C:\\path\\to\\file.js:10:5)`;

    const result = await wasmParser.parseStackAsync(stackWithColonPath);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].fileName).toBe('C:\\path\\to\\file.js');
    expect(result[0].lineNumber).toBe(10);
  });

  // 性能测试 - 仅当实际环境支持足够运行时才执行断言
  test('should parse large stack traces efficiently', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    // 创建一个大型堆栈
    let largeStack = 'Error: Performance test\n';
    for (let i = 0; i < 100; i++) {
      largeStack += `    at function${i} (file${i}.js:${i}:${i})\n`;
    }

    const start = performance.now();
    const result = await wasmParser.parseStackAsync(largeStack);
    const end = performance.now();
    const duration = end - start;

    expect(result.length).toBe(100);

    console.info(`解析100帧堆栈耗时: ${duration}ms`);

    // 根据运行环境调整期望:
    // 在真实WASM环境下会更快，但在模拟环境下可能较慢
    if (isWasmAvailable) {
      expect(duration).toBeLessThan(500); // WASM环境，期望更快
    } else {
      expect(duration).toBeLessThan(1000); // JS回退，允许稍慢
    }
  });

  // 同步API测试
  test('should provide a synchronous fallback', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const stack = `Error: Sync API test
        at syncFunction (sync.js:5:10)`;

    const result = wasmParser.parseStack(stack);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].functionName).toBe('syncFunction');
  });

  // 重置功能测试
  test('should reset parser state correctly', async () => {
    // 首先初始化
    await wasmParser.initialize();

    // 然后重置
    wasmParser.reset();

    // 重置后，应该能重新初始化
    const initResult = await wasmParser.initialize();
    expect(typeof initResult).toBe('boolean');

    // 重置后应该仍然可以解析
    const stack = `Error: Reset test
        at resetFunction (reset.js:1:1)`;

    const result = await wasmParser.parseStackAsync(stack);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  // 测试WASM和JS回退的一致性
  test('should provide consistent results between WASM and JS fallback', async () => {
    // 确保在测试前初始化
    await wasmParser.initialize();

    const testStack = `Error: Consistency test
        at testFunc (test.js:42:10)`;

    // 使用parseStackAsync (可能使用WASM或JS回退)
    const asyncResult = await wasmParser.parseStackAsync(testStack);

    // 使用parseStack (仅使用JS回退)
    const syncResult = wasmParser.parseStack(testStack);

    // 验证两者结果格式一致
    expect(asyncResult.length).toBe(syncResult.length);

    if (asyncResult.length > 0 && syncResult.length > 0) {
      expect(asyncResult[0].functionName).toBe(syncResult[0].functionName);
      expect(asyncResult[0].fileName).toBe(syncResult[0].fileName);
      expect(asyncResult[0].lineNumber).toBe(syncResult[0].lineNumber);
      expect(asyncResult[0].columnNumber).toBe(syncResult[0].columnNumber);
    }
  });
});
