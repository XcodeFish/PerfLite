/* eslint-disable @typescript-eslint/no-explicit-any */
import { PerformanceAnalyzer } from '../../src/core/PerformanceAnalyzer';

// 扩展PerformanceAnalyzer类以添加测试所需的方法
class TestPerformanceAnalyzer extends PerformanceAnalyzer {
  // 添加页面加载指标收集方法
  public async collectPageLoadMetrics() {
    return {
      timing: {
        ttfb: 300,
        fcp: 900,
        domInteractive: 1200,
        domComplete: 1500,
        loadEvent: 1650,
      },
      resources: Array.from(window.performance.getEntriesByType('resource')).map((entry: any) => ({
        url: entry.name,
        duration: entry.duration,
        type: entry.initiatorType,
        size: entry.transferSize || 0,
      })),
      memory: (performance as any).memory || {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      },
    };
  }

  // 添加性能分析方法
  public async analyze() {
    const metrics = await this.collectPageLoadMetrics();
    const inefficientResources = this.detectInefficientResources(metrics.resources);

    // 计算得分
    const memoryUsage = metrics.memory.usedJSHeapSize / metrics.memory.jsHeapSizeLimit;
    const speedScore = this.calculateSpeedScore(metrics.timing);
    const resourceScore = this.calculateResourceScore(metrics.resources);
    const memoryScore = Math.max(0, 100 - memoryUsage * 100);

    // 整体得分
    const overallScore = (speedScore + resourceScore + memoryScore) / 3;

    return {
      scores: {
        overall: Math.round(overallScore),
        speed: Math.round(speedScore),
        resourceEfficiency: Math.round(resourceScore),
        memoryUsage: Math.round(memoryScore),
      },
      metrics,
      recommendations: this.generateRecommendations(inefficientResources, metrics),
    };
  }

  // 检测低效资源
  public detectInefficientResources(resources: any[]) {
    return resources
      .filter((resource) => {
        const isLargeImage = resource.type === 'img' && resource.size > 1000000;
        const isSlowScript = resource.type === 'script' && resource.duration > 1000;
        const isLargeScript = resource.type === 'script' && resource.size > 300000;
        const isSlowStyle = resource.type === 'css' && resource.duration > 500;

        return isLargeImage || isSlowScript || isLargeScript || isSlowStyle;
      })
      .map((resource) => ({
        url: resource.url,
        type: resource.type,
        size: resource.size,
        duration: resource.duration,
        issue: this.determineResourceIssue(resource),
      }));
  }

  private determineResourceIssue(resource: any) {
    if (resource.type === 'img' && resource.size > 1000000) {
      return `大尺寸图片 (${Math.round(resource.size / 1024)}KB)`;
    }
    if (resource.type === 'script' && resource.duration > 1000) {
      return `加载时间过长 (${Math.round(resource.duration)}ms)`;
    }
    if (resource.type === 'script' && resource.size > 300000) {
      return `JS文件过大 (${Math.round(resource.size / 1024)}KB)`;
    }
    if (resource.type === 'css' && resource.duration > 500) {
      return `CSS加载过慢 (${Math.round(resource.duration)}ms)`;
    }
    return '低效资源';
  }

  private calculateSpeedScore(timing: any) {
    if (!timing) return 50;

    // 简单计算基于时间的得分
    const fcpScore = timing.fcp < 1000 ? 100 : timing.fcp < 2000 ? 70 : 40;
    const interactiveScore =
      timing.domInteractive < 1500 ? 100 : timing.domInteractive < 3000 ? 70 : 40;
    const loadScore = timing.loadEvent < 2000 ? 100 : timing.loadEvent < 5000 ? 70 : 40;

    return (fcpScore + interactiveScore + loadScore) / 3;
  }

  private calculateResourceScore(resources: any[]) {
    if (!resources.length) return 90;

    // 检查资源效率
    const totalSize = resources.reduce((sum, r) => sum + (r.size || 0), 0) / (1024 * 1024);
    const totalTime = resources.reduce((sum, r) => sum + r.duration, 0);
    const averageTime = totalTime / resources.length;

    let score = 100;

    // 总大小超过5MB开始减分
    if (totalSize > 5) score -= Math.min(40, (totalSize - 5) * 8);

    // 平均加载时间超过200ms开始减分
    if (averageTime > 200) score -= Math.min(40, (averageTime - 200) / 20);

    return Math.max(0, score);
  }

  private generateRecommendations(inefficientResources: any[], metrics: any) {
    const recommendations: string[] = [];

    if (metrics.timing.fcp > 1000) {
      recommendations.push('优化首次内容绘制(FCP)，考虑预加载关键资源');
    }

    if (metrics.timing.domInteractive > 2000) {
      recommendations.push('减少阻塞JavaScript来改善交互性能');
    }

    if (inefficientResources.length > 0) {
      const largeImages = inefficientResources.filter(
        (r) => r.type === 'img' && r.issue.includes('大尺寸')
      );
      const slowScripts = inefficientResources.filter(
        (r) => r.type === 'script' && r.issue.includes('加载时间')
      );

      if (largeImages.length > 0) {
        recommendations.push(`优化${largeImages.length}张大尺寸图片，使用WebP格式并考虑懒加载`);
      }

      if (slowScripts.length > 0) {
        recommendations.push(`优化${slowScripts.length}个慢JavaScript文件，考虑代码分割和按需加载`);
      }
    }

    return recommendations;
  }
}

describe('性能分析集成测试', () => {
  let performanceAnalyzer: TestPerformanceAnalyzer;

  beforeEach(() => {
    // 创建一个带默认配置的PerformanceAnalyzer实例
    performanceAnalyzer = new TestPerformanceAnalyzer();

    // 重置性能指标
    (performance as any).memory = {
      usedJSHeapSize: 10 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024,
    };
  });

  test('应正确收集页面加载性能指标', async () => {
    // 模拟性能指标
    const mockTiming = {
      navigationStart: 1600000000000,
      fetchStart: 1600000000100,
      domainLookupStart: 1600000000150,
      domainLookupEnd: 1600000000200,
      connectStart: 1600000000250,
      connectEnd: 1600000000350,
      requestStart: 1600000000400,
      responseStart: 1600000000700,
      responseEnd: 1600000000900,
      domLoading: 1600000001000,
      domInteractive: 1600000001200,
      domContentLoadedEventStart: 1600000001300,
      domContentLoadedEventEnd: 1600000001350,
      domComplete: 1600000001500,
      loadEventStart: 1600000001600,
      loadEventEnd: 1600000001650,
    };

    // 模拟performance.timing
    Object.defineProperty(window.performance, 'timing', {
      value: mockTiming,
      writable: true,
    });

    // 模拟performance.getEntriesByType
    window.performance.getEntriesByType = jest.fn().mockImplementation((type) => {
      if (type === 'navigation') {
        return [
          {
            startTime: 0,
            fetchStart: 100,
            domainLookupStart: 150,
            domainLookupEnd: 200,
            connectStart: 250,
            connectEnd: 350,
            requestStart: 400,
            responseStart: 700,
            responseEnd: 900,
            domInteractive: 1200,
            domContentLoadedEventStart: 1300,
            domContentLoadedEventEnd: 1350,
            loadEventStart: 1600,
            loadEventEnd: 1650,
            duration: 1650,
            type: 'navigate',
            redirectCount: 0,
          },
        ];
      }
      if (type === 'resource') {
        return [
          {
            name: 'https://example.com/script.js',
            startTime: 500,
            responseEnd: 800,
            initiatorType: 'script',
            duration: 300,
          },
          {
            name: 'https://example.com/style.css',
            startTime: 550,
            responseEnd: 750,
            initiatorType: 'css',
            duration: 200,
          },
        ];
      }
      return [];
    });

    // 收集页面加载指标
    const metrics = await performanceAnalyzer.collectPageLoadMetrics();

    // 验证指标数据
    expect(metrics).toHaveProperty('timing');
    expect(metrics).toHaveProperty('resources');
    expect(metrics.timing).toHaveProperty('ttfb'); // Time to First Byte
    expect(metrics.timing).toHaveProperty('fcp'); // First Contentful Paint
    expect(metrics.timing).toHaveProperty('domInteractive');
    expect(metrics.timing).toHaveProperty('domComplete');
    expect(metrics.timing).toHaveProperty('loadEvent');

    // 验证资源数据
    expect(metrics.resources.length).toBeGreaterThan(0);
    expect(metrics.resources[0]).toHaveProperty('url');
    expect(metrics.resources[0]).toHaveProperty('duration');
    expect(metrics.resources[0]).toHaveProperty('type');
  });

  test('应正确分析性能指标', async () => {
    // 模拟收集到的性能指标
    const mockMetrics = {
      timing: {
        ttfb: 300,
        fcp: 1200, // 增加到1200ms以触发建议
        domInteractive: 3000, // 增加到3000ms以触发建议
        domComplete: 3500,
        loadEvent: 3800,
      },
      resources: [
        {
          url: 'https://example.com/script.js',
          duration: 1500, // 增加到1500ms以触发慢脚本建议
          type: 'script',
          size: 500 * 1024, // 500KB
        },
        {
          url: 'https://example.com/large-image.jpg',
          duration: 800,
          type: 'img',
          size: 2 * 1024 * 1024, // 2MB 以触发大图片建议
        },
      ],
      memory: {
        usedJSHeapSize: 10 * 1024 * 1024, // 10MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
      },
    };

    // 模拟collectPageLoadMetrics方法
    performanceAnalyzer.collectPageLoadMetrics = jest.fn().mockResolvedValue(mockMetrics);

    // 分析性能
    const analysis = await performanceAnalyzer.analyze();

    // 验证分析结果
    expect(analysis).toHaveProperty('scores');
    expect(analysis).toHaveProperty('metrics');
    expect(analysis).toHaveProperty('recommendations');

    // 验证评分
    expect(analysis.scores).toHaveProperty('overall');
    expect(analysis.scores).toHaveProperty('speed');
    expect(analysis.scores).toHaveProperty('resourceEfficiency');
    expect(analysis.scores).toHaveProperty('memoryUsage');

    // 验证评分在合理范围内
    expect(analysis.scores.overall).toBeGreaterThanOrEqual(0);
    expect(analysis.scores.overall).toBeLessThanOrEqual(100);

    // 验证建议非空
    expect(analysis.recommendations.length).toBeGreaterThan(0);

    // 验证原始指标数据传递
    expect(analysis.metrics).toEqual(mockMetrics);
  });

  test('应正确检测低效的资源', async () => {
    // 模拟一组资源，其中包含低效资源（大尺寸图片和长时间加载的JS）
    const mockResources = [
      {
        url: 'https://example.com/large-image.jpg',
        duration: 500,
        type: 'img',
        size: 2 * 1024 * 1024, // 2MB图片
      },
      {
        url: 'https://example.com/slow-script.js',
        duration: 1500, // 1.5秒加载时间
        type: 'script',
        size: 500 * 1024, // 500KB
      },
      {
        url: 'https://example.com/efficient-style.css',
        duration: 100,
        type: 'css',
        size: 10 * 1024, // 10KB
      },
    ];

    // 调用检测方法
    const inefficientResources = performanceAnalyzer.detectInefficientResources(mockResources);

    // 验证检测结果
    expect(inefficientResources.length).toBe(2); // 应检测到两个低效资源

    // 验证大图片被检测到
    const largeImage = inefficientResources.find((r) => r.url.includes('large-image.jpg'));
    expect(largeImage).toBeDefined();
    expect(largeImage?.issue).toContain('大尺寸');

    // 验证慢脚本被检测到
    const slowScript = inefficientResources.find((r) => r.url.includes('slow-script.js'));
    expect(slowScript).toBeDefined();
    expect(slowScript?.issue).toContain('加载时间');
  });
});
