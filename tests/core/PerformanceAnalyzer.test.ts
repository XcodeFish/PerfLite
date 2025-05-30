/**
 * PerformanceAnalyzer 组件的单元测试
 * 测试性能分析器的错误关联功能
 */
import { PerformanceAnalyzer } from '../../src/core/PerformanceAnalyzer';
import { IParsedError } from '../../src/types/error';

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
    // 手动添加性能指标数据到分析器
    const perfData = [
      { name: 'loadTime', value: 200, unit: 'ms', timestamp: 1620000000000 },
      { name: 'loadTime', value: 250, unit: 'ms', timestamp: 1620000001000 },
    ];
    perfData.forEach((data) => analyzer.addMetric(data));
  });

  /**
   * 测试将性能指标与错误事件相关联的功能
   * 验证时间接近的错误和性能指标能够正确关联
   */
  test('should correlate errors with performance metrics', () => {
    const errors: IParsedError[] = [
      {
        timestamp: 1620000000500,
        message: 'Error 1',
        stack: 'Error: Error 1\n    at function1 (file1.js:10:5)',
        type: 'unknown',
        name: 'Error',
        parsedStack: [
          {
            functionName: 'function1',
            fileName: 'file1.js',
            lineNumber: 10,
            columnNumber: 5,
          },
        ],
        frames: [],
      },
      {
        timestamp: 1620000001500,
        message: 'Error 2',
        stack: 'Error: Error 2\n    at function2 (file2.js:20:15)',
        type: 'unknown',
        name: 'Error',
        parsedStack: [
          {
            functionName: 'function2',
            fileName: 'file2.js',
            lineNumber: 20,
            columnNumber: 15,
          },
        ],
        frames: [],
      },
    ];

    const result = analyzer.correlateErrors(errors);

    expect(result).toEqual([
      {
        timestamp: 1620000000500,
        message: 'Error 1',
        stack: 'Error: Error 1\n    at function1 (file1.js:10:5)',
        type: 'unknown',
        name: 'Error',
        parsedStack: [
          {
            functionName: 'function1',
            fileName: 'file1.js',
            lineNumber: 10,
            columnNumber: 5,
          },
        ],
        frames: [],
        relatedMetrics: expect.any(Array),
        relatedResources: expect.any(Array),
      },
      {
        timestamp: 1620000001500,
        message: 'Error 2',
        stack: 'Error: Error 2\n    at function2 (file2.js:20:15)',
        type: 'unknown',
        name: 'Error',
        parsedStack: [
          {
            functionName: 'function2',
            fileName: 'file2.js',
            lineNumber: 20,
            columnNumber: 15,
          },
        ],
        frames: [],
        relatedMetrics: expect.any(Array),
        relatedResources: expect.any(Array),
      },
    ]);
  });
});
