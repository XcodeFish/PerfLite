import { PerformanceAnalyzer } from '../src/core/PerformanceAnalyzer';

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
    const errors = [
      { timestamp: 1620000000500, message: 'Error 1' },
      { timestamp: 1620000001500, message: 'Error 2' },
    ];

    const result = analyzer.correlateErrors(perfData, errors);

    expect(result).toEqual([
      {
        timestamp: 1620000000500,
        message: 'Error 1',
        relatedMetrics: [{ timestamp: 1620000000000, metric: 'loadTime', value: 200 }],
      },
      {
        timestamp: 1620000001500,
        message: 'Error 2',
        relatedMetrics: [{ timestamp: 1620000001000, metric: 'loadTime', value: 250 }],
      },
    ]);
  });
});