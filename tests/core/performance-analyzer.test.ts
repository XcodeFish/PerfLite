import { PerformanceAnalyzer } from '../../src/core/PerformanceAnalyzer';
import { IParsedError } from '../../src/types';

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
  });

  test('should correlate errors with performance metrics', () => {
    const perfData = [
      { timestamp: 1620000000000, metric: 'loadTime', value: 200 },
      { timestamp: 1620000001000, metric: 'loadTime', value: 250 },
    ];
    const errors: IParsedError[] = [
      {
        timestamp: 1620000000500,
        message: 'Error 1',
        name: 'Error',
        stack: '',
        type: 'unknown',
        parsedStack: [],
        frames: [],
      },
      {
        timestamp: 1620000001500,
        message: 'Error 2',
        name: 'Error',
        stack: '',
        type: 'unknown',
        parsedStack: [],
        frames: [],
      },
    ];

    // 先添加性能数据
    perfData.forEach((data) =>
      analyzer.addMetric({
        name: data.metric,
        value: data.value,
        timestamp: data.timestamp,
        unit: 'ms',
      })
    );

    // 然后只传递errors参数
    const result = analyzer.correlateErrors(errors);

    expect(result).toEqual([
      {
        timestamp: 1620000000500,
        message: 'Error 1',
        name: 'Error',
        stack: '',
        type: 'unknown',
        parsedStack: [],
        frames: [],
        relatedMetrics: expect.arrayContaining([
          expect.objectContaining({ timestamp: 1620000000000 }),
        ]),
      },
      {
        timestamp: 1620000001500,
        message: 'Error 2',
        name: 'Error',
        stack: '',
        type: 'unknown',
        parsedStack: [],
        frames: [],
        relatedMetrics: expect.arrayContaining([
          expect.objectContaining({ timestamp: 1620000001000 }),
        ]),
      },
    ]);
  });
});
