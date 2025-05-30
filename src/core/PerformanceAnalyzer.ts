import {
  IPerformanceMetric,
  IResourceTiming,
  IPerformanceTimeline,
  IErrorWithMetrics,
  IPerformanceReport,
} from '../types/perf';
import { IParsedError } from '../types';

export class PerformanceAnalyzer {
  private metricsBuffer: IPerformanceMetric[] = [];
  private resourcesBuffer: IResourceTiming[] = [];
  private marks: { name: string; timestamp: number }[] = [];
  private measures: { name: string; duration: number; timestamp: number }[] = [];
  private timeRange: number = 1000; // 关联时间范围(ms)

  constructor(
    options: {
      timeRange?: number;
      bufferSize?: number;
    } = {}
  ) {
    this.timeRange = options.timeRange || 1000;

    // 初始化性能观察器
    this.initPerformanceObservers();
  }

  /**
   * 初始化性能观察器，收集性能数据
   */
  private initPerformanceObservers(): void {
    // 如果浏览器支持PerformanceObserver API
    if (typeof PerformanceObserver !== 'undefined') {
      // 监控资源加载性能
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];

          for (const entry of entries) {
            this.addResourceTiming({
              name: entry.name,
              initiatorType: entry.initiatorType,
              startTime: entry.startTime,
              duration: entry.duration,
              transferSize: entry.transferSize,
            });
          }
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch {
        console.warn('PerfLite: Resource timing observation not supported');
      }

      // 监控导航和绘制性能
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          for (const entry of entries) {
            this.addMetric({
              name: entry.name,
              value: entry.startTime,
              timestamp: performance.now(),
              unit: 'ms',
              metadata: { type: 'paint' },
            });
          }
        });

        paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      } catch {
        console.warn('PerfLite: Paint timing observation not supported');
      }

      // 监控标记和测量
      try {
        const markObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          for (const entry of entries) {
            if (entry.entryType === 'mark') {
              this.marks.push({
                name: entry.name,
                timestamp: entry.startTime,
              });
            } else if (entry.entryType === 'measure') {
              this.measures.push({
                name: entry.name,
                duration: entry.duration,
                timestamp: entry.startTime,
              });
            }
          }
        });

        markObserver.observe({ entryTypes: ['mark', 'measure'] });
      } catch {
        console.warn('PerfLite: Mark/Measure observation not supported');
      }
    }
  }

  /**
   * 添加性能指标
   */
  public addMetric(metric: IPerformanceMetric): void {
    this.metricsBuffer.push(metric);

    // 保持缓冲区大小可控
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer.shift();
    }
  }

  /**
   * 添加资源计时信息
   */
  public addResourceTiming(timing: IResourceTiming): void {
    this.resourcesBuffer.push(timing);

    // 保持缓冲区大小可控
    if (this.resourcesBuffer.length > 1000) {
      this.resourcesBuffer.shift();
    }
  }

  /**
   * 将错误与相关的性能指标关联起来
   */
  public correlateErrors(errors: IParsedError[]): IErrorWithMetrics[] {
    return errors.map((error) => {
      // 寻找发生在错误时间点附近的性能指标
      const relatedMetrics = this.metricsBuffer.filter(
        (metric) => Math.abs(metric.timestamp - error.timestamp) < this.timeRange
      );

      // 寻找在错误发生前后加载的资源
      const relatedResources = this.resourcesBuffer.filter(
        (resource) => Math.abs(resource.startTime - error.timestamp) < this.timeRange
      );

      return {
        ...error,
        relatedMetrics,
        relatedResources,
      };
    });
  }

  /**
   * 获取当前性能时间线
   */
  public getTimeline(): IPerformanceTimeline {
    return {
      metrics: [...this.metricsBuffer],
      resources: [...this.resourcesBuffer],
      marks: [...this.marks],
      measures: [...this.measures],
      sessionId: this.generateSessionId(),
      startTime: this.getStartTime(),
      endTime: performance.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * 获取开始时间
   */
  private getStartTime(): number {
    return window.performance?.timing?.navigationStart || Date.now() - 60000;
  }

  /**
   * 生成性能报告，包含性能分数和优化建议
   */
  public generateReport(errors: IParsedError[] = []): IPerformanceReport {
    const errorWithMetrics = this.correlateErrors(errors);
    const timeline = this.getTimeline();

    // 计算性能分数（示例实现）
    const score = this.calculatePerformanceScore(timeline);

    // 生成优化建议
    const suggestions = this.generateSuggestions(timeline, errorWithMetrics);

    return {
      timeline,
      errors: errorWithMetrics,
      score,
      suggestions,
    };
  }

  /**
   * 计算性能分数
   * 这是一个简化的实现，实际项目中可能需要更复杂的算法
   */
  private calculatePerformanceScore(timeline: IPerformanceTimeline): number {
    // 查找关键性能指标
    const fcp = timeline.metrics.find((m) => m.name === 'first-contentful-paint')?.value || 0;
    const lcp = timeline.metrics.find((m) => m.name === 'largest-contentful-paint')?.value || 0;

    // 计算资源加载情况
    const totalResourceTime = timeline.resources.reduce(
      (sum: number, res: IResourceTiming) => sum + res.duration,
      0
    );
    const resourceCount = timeline.resources.length;

    // 简单的评分算法（满分100）
    let score = 100;

    // FCP超过1秒扣分
    if (fcp > 1000) score -= Math.min(20, ((fcp - 1000) / 1000) * 10);

    // LCP超过2.5秒扣分
    if (lcp > 2500) score -= Math.min(30, ((lcp - 2500) / 1000) * 10);

    // 资源加载时间过长扣分
    if (resourceCount > 0) {
      const avgResourceTime = totalResourceTime / resourceCount;
      if (avgResourceTime > 500) score -= Math.min(20, ((avgResourceTime - 500) / 100) * 2);
    }

    // 资源数量过多扣分
    if (resourceCount > 50) score -= Math.min(10, ((resourceCount - 50) / 10) * 2);

    return Math.max(0, Math.round(score));
  }

  /**
   * 生成性能优化建议
   */
  private generateSuggestions(
    timeline: IPerformanceTimeline,
    errors: IErrorWithMetrics[]
  ): string[] {
    const suggestions: string[] = [];

    // 基于FCP的建议
    const fcp = timeline.metrics.find((m) => m.name === 'first-contentful-paint')?.value;
    if (fcp && fcp > 1000) {
      suggestions.push('首次内容绘制时间过长，建议优化关键渲染路径');
    }

    // 基于资源加载的建议
    const largeResources = timeline.resources.filter(
      (r: IResourceTiming) => r.transferSize && r.transferSize > 500000
    );
    if (largeResources.length > 0) {
      suggestions.push(`检测到${largeResources.length}个大型资源，建议进行压缩或懒加载`);
    }

    // 基于错误的建议
    if (errors.length > 0) {
      const resourceRelatedErrors = errors.filter(
        (e) => e.relatedResources && e.relatedResources.length > 0
      );
      if (resourceRelatedErrors.length > 0) {
        suggestions.push('检测到与资源加载相关的错误，建议检查网络请求');
      }
    }

    return suggestions;
  }

  /**
   * 重置分析器状态
   */
  public reset(): void {
    this.metricsBuffer = [];
    this.resourcesBuffer = [];
    this.marks = [];
    this.measures = [];
  }
}
