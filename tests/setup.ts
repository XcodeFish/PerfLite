/**
 * 测试环境设置文件
 * 提供全局模拟对象和API以便于测试执行
 */
// 不再需要导入TextEncoder和TextDecoder

/**
 * 模拟WebAssembly环境
 * 提供一个简单的模拟解析器实现
 */
const mockWasm = {
  parse: jest.fn(() => {
    return {
      file: 'mock-file.js',
      line: 42,
      column: 10,
      functionName: 'mockFunction',
    };
  }),
  parse_stack: jest.fn(() => {
    return [
      {
        functionName: 'functionA',
        fileName: 'file1.js',
        lineNumber: 1,
        columnNumber: 10,
      },
      {
        functionName: 'functionB',
        fileName: 'file2.js',
        lineNumber: 2,
        columnNumber: 20,
      },
    ];
  }),
};

// 模拟WebAssembly
globalThis.WebAssembly = {
  instantiate: jest.fn().mockResolvedValue({
    instance: {
      exports: mockWasm,
    },
  }),
  Instance: jest.fn().mockImplementation(() => ({
    exports: mockWasm,
  })),
} as unknown as typeof WebAssembly;

/**
 * 模拟fetch API
 * 对于DeepSeek API的调用返回模拟数据
 * 对于WASM文件的请求返回模拟的ArrayBuffer
 * 其他调用将返回网络错误
 */
globalThis.fetch = jest.fn().mockImplementation((url) => {
  if (String(url).includes('deepseek')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          file: 'deep-analyzed.js',
          line: 100,
          column: 5,
          functionName: 'complexFunction',
        }),
    });
  }

  // 处理WASM文件请求
  if (String(url).includes('.wasm')) {
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), // 返回一个空的ArrayBuffer
    });
  }

  return Promise.reject(new Error('Network error'));
});
