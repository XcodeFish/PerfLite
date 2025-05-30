/**
 * 测试环境设置文件
 * 提供全局模拟对象和API以便于测试执行
 */
// 不再需要导入TextEncoder和TextDecoder

// 添加类型定义以便测试
type MockWasm = {
  [key: string]: jest.Mock<any, any>;
};

/**
 * 模拟WebAssembly环境
 * 提供一个简单的模拟解析器实现
 */
const mockWasm: MockWasm = {
  parse: jest.fn((stack) => {
    // 根据传入的错误栈返回不同的数据
    if (stack && stack.includes('Test error')) {
      return {
        file: 'file.js',
        line: 10,
        column: 5,
        functionName: 'functionName',
      };
    }
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
    ];
  }),
  init_parser: jest.fn(),
  parse_simd: jest.fn(() => []),
  parse_stack_simd: jest.fn((stack) => {
    // 根据传入的错误栈动态返回不同的数据
    if (stack && stack.includes('Test error')) {
      return JSON.stringify([
        {
          function_name: 'functionName',
          file_name: 'file.js',
          line_number: 10,
          column_number: 5,
        },
      ]);
    } else if (stack && stack.includes('Multi-frame test')) {
      return JSON.stringify([
        {
          function_name: 'frame1',
          file_name: 'file1.js',
          line_number: 10,
          column_number: 5,
        },
        {
          function_name: 'frame2',
          file_name: 'file2.js',
          line_number: 20,
          column_number: 10,
        },
        {
          function_name: 'frame3',
          file_name: 'file3.js',
          line_number: 30,
          column_number: 15,
        },
      ]);
    } else if (stack && stack.includes('Path with colon')) {
      return JSON.stringify([
        {
          function_name: 'func',
          file_name: 'C:\\path\\to\\file.js',
          line_number: 10,
          column_number: 5,
        },
      ]);
    } else if (stack && stack.includes('Performance test')) {
      // 创建大量栈帧
      const frames: Array<{
        function_name: string;
        file_name: string;
        line_number: number;
        column_number: number;
      }> = [];
      for (let i = 0; i < 100; i++) {
        frames.push({
          function_name: `function${i}`,
          file_name: `file${i}.js`,
          line_number: i,
          column_number: i,
        });
      }
      return JSON.stringify(frames);
    } else if (stack && stack.includes('Consistency test')) {
      // 与JS实现一致的单帧
      return JSON.stringify([
        {
          function_name: 'testFunc',
          file_name: 'test.js',
          line_number: 42,
          column_number: 10,
        },
      ]);
    }

    // 默认返回两个帧
    return JSON.stringify([
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
    ]);
  }),
  parse_line_column_simd: jest.fn(() => []),
  is_simd_enabled: jest.fn(() => false),
  get_version: jest.fn(() => '0.1.0'),
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
  // 添加Memory模拟实现
  Memory: jest.fn().mockImplementation(({ initial }) => {
    const buffer = new ArrayBuffer(initial * 64 * 1024);
    return {
      buffer,
      grow: jest.fn(),
    };
  }),
  Module: jest.fn(),
  compile: jest.fn().mockResolvedValue({}),
  validate: jest.fn().mockReturnValue(true),
  compileStreaming: jest.fn().mockResolvedValue({}),
  instantiateStreaming: jest.fn().mockResolvedValue({
    instance: {
      exports: mockWasm,
    },
  }),
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

// 添加模拟性能API (如果在Node环境中不存在)
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  } as unknown as Performance;
}
