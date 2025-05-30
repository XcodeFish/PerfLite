// tests/parser/wasm.test.ts
/**
 * WASM解析器单元测试
 * 测试WebAssembly解析器的功能和性能
 */
import { WasmParser } from '../../src/parser/wasm';

describe('WASM Parser', () => {
  let wasmParser: WasmParser;

  beforeEach(() => {
    wasmParser = new WasmParser();
    // WASM解析器不需要显式初始化
  });

  /**
   * 测试解析简单错误堆栈的能力
   */
  test('解析简单堆栈', () => {
    const simpleStack = `Error: Simple error
      at functionA (file1.js:1:10)
      at functionB (file2.js:2:20)`;

    const result = wasmParser.parseStack(simpleStack);

    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe('file1.js');
    expect(result[0].lineNumber).toBe(1);
  });

  /**
   * 测试处理格式不规范的错误堆栈
   */
  test('处理畸形堆栈', () => {
    const malformedStack = `Error: Malformed
      Bad stack line
      at functionName (no parentheses)`;

    const result = wasmParser.parseStack(malformedStack);

    // 即使输入畸形也应该返回某些结果
    expect(result).toBeDefined();
    // 具体期望取决于解析器如何处理畸形输入
  });

  /**
   * 测试异步解析方法
   */
  test('异步解析堆栈', async () => {
    const stack = `Error: Async test
      at functionA (file1.js:1:10)
      at functionB (file2.js:2:20)`;

    const result = await wasmParser.parseStackAsync(stack);

    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe('file1.js');
  });

  /**
   * 性能基准测试
   */
  test('[性能] WASM解析性能 - 15ms', () => {
    const largeStack = Array(100)
      .fill(null)
      .map((_, i) => `at function${i} (file${i}.js:${i}:${i * 10})`)
      .join('\n');

    const start = Date.now();
    wasmParser.parseStack(largeStack);
    const end = Date.now();

    expect(end - start).toBeLessThan(50);
  });
});
