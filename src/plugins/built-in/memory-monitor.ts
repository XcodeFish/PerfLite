/* eslint-disable indent */
import { BasePlugin } from '../interface';

interface IMemoryMetric {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  timestamp: number;
}

interface IMemoryLeakAlert {
  type: 'memory_leak';
  severity: 'warning' | 'critical';
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  leakRate: number; // 泄漏率
  continuousGrowthFrames: number; // 连续增长的帧数
  timestamp: number;
}

/**
 * 内存泄漏检测插件
 *
 * 通过监控内存使用情况，识别可能的内存泄漏
 */
export class MemoryMonitorPlugin extends BasePlugin<unknown> {
  private memoryMetrics: IMemoryMetric[] = [];
  private memoryThreshold = 0.9; // 90%内存使用率警告
  private criticalThreshold = 0.95; // 95%内存使用率严重警告
  private leakDetectionFrames = 10; // 连续10帧增长视为可能泄漏
  private maxSampleSize = 100; // 最大样本数
  private intervalId: number | null = null;
  private continuousGrowth = 0; // 连续增长帧数
  private lastSize = 0; // 上一次的内存使用量
  private sampleInterval = 2000; // 2秒采样一次

  constructor() {
    super(
      'memory-monitor',
      '1.0.0',
      {
        init: async (config?: unknown) => {
          if (config && typeof config === 'object') {
            // 自定义配置
            const typedConfig = config as {
              memoryThreshold?: number;
              criticalThreshold?: number;
              leakDetectionFrames?: number;
              maxSampleSize?: number;
              sampleInterval?: number;
            };

            if (typedConfig.memoryThreshold) {
              this.memoryThreshold = typedConfig.memoryThreshold;
            }

            if (typedConfig.criticalThreshold) {
              this.criticalThreshold = typedConfig.criticalThreshold;
            }

            if (typedConfig.leakDetectionFrames) {
              this.leakDetectionFrames = typedConfig.leakDetectionFrames;
            }

            if (typedConfig.maxSampleSize) {
              this.maxSampleSize = typedConfig.maxSampleSize;
            }

            if (typedConfig.sampleInterval) {
              this.sampleInterval = typedConfig.sampleInterval;
            }
          }

          this.startMonitoring();
        },

        destroy: async () => {
          this.stopMonitoring();
        },

        beforeSend: (data) => {
          if (data && typeof data === 'object' && 'type' in data) {
            if (data.type === 'error' || data.type === 'performance') {
              // 向错误或性能数据中添加内存指标
              const memoryData = this.getLatestMemoryMetric();

              if (memoryData) {
                return {
                  ...data,
                  memoryInfo: memoryData,
                };
              }
            }
          }

          return data;
        },
      },
      {
        name: 'memory-monitor',
        version: '1.0.0',
        enabled: true,
        priority: 100, // 高优先级，确保内存信息最先被添加
      },
      {
        name: 'memory-monitor',
        version: '1.0.0',
        description: '内存泄漏检测插件',
        author: 'PerfLite Team',
        category: 'monitoring',
        tags: ['memory', 'performance', 'leak'],
      }
    );
  }

  /**
   * 启动内存监控
   */
  private startMonitoring(): void {
    if (!this.isMemoryAPIAvailable()) {
      console.warn('Memory API is not available in this browser');
      return;
    }

    // 初始采样
    this.sampleMemory();

    // 定期采样
    this.intervalId = window.setInterval(() => {
      this.sampleMemory();
    }, this.sampleInterval);
  }

  /**
   * 停止内存监控
   */
  private stopMonitoring(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 采样内存使用情况
   */
  private sampleMemory(): void {
    if (!this.isMemoryAPIAvailable()) return;

    const memory = (window.performance as any).memory;
    const currentMetric: IMemoryMetric = {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      timestamp: Date.now(),
    };

    this.memoryMetrics.push(currentMetric);

    // 限制数组大小，保留最新的样本
    if (this.memoryMetrics.length > this.maxSampleSize) {
      this.memoryMetrics.shift();
    }

    // 检测内存泄漏
    this.detectMemoryLeak(currentMetric);
  }

  /**
   * 检测内存泄漏
   * @param currentMetric 当前内存指标
   */
  private detectMemoryLeak(currentMetric: IMemoryMetric): void {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = currentMetric;

    // 检查内存使用率
    const memoryUsageRatio = usedJSHeapSize / jsHeapSizeLimit;

    // 检查连续增长
    if (usedJSHeapSize > this.lastSize) {
      this.continuousGrowth++;
    } else {
      this.continuousGrowth = 0;
    }

    this.lastSize = usedJSHeapSize;

    // 判断是否可能存在内存泄漏
    if (this.continuousGrowth >= this.leakDetectionFrames) {
      // 计算最近的内存增长率
      const oldestMetricInRange =
        this.memoryMetrics[Math.max(0, this.memoryMetrics.length - this.leakDetectionFrames)];
      const growthRate =
        (usedJSHeapSize - oldestMetricInRange.usedJSHeapSize) / oldestMetricInRange.usedJSHeapSize;

      let severity: 'warning' | 'critical' = 'warning';

      // 判断严重程度
      if (memoryUsageRatio >= this.criticalThreshold) {
        severity = 'critical';
      }

      // 只有当内存使用率超过阈值或增长率异常时才报警
      if (memoryUsageRatio >= this.memoryThreshold || growthRate > 0.2) {
        const alert: IMemoryLeakAlert = {
          type: 'memory_leak',
          severity,
          usedJSHeapSize,
          totalJSHeapSize,
          leakRate: growthRate,
          continuousGrowthFrames: this.continuousGrowth,
          timestamp: Date.now(),
        };

        // 触发内存泄漏事件
        this.emit('memoryLeakDetected', alert);

        // 严重时，建议执行垃圾回收
        if (severity === 'critical') {
          // 无法直接调用GC，提示开发者在开发时关注内存问题
          console.warn('Critical memory usage detected! Consider checking for memory leaks.');

          // 自动采取一些可能的缓解措施
          this.attemptToReduceMemory();
        }
      }
    }
  }

  /**
   * 尝试减少内存使用
   * 在内存危急时采取的措施
   */
  private attemptToReduceMemory(): void {
    // 减少采样频率
    if (this.sampleInterval < 10000) {
      this.sampleInterval *= 2;

      if (this.intervalId !== null) {
        window.clearInterval(this.intervalId);
        this.intervalId = window.setInterval(() => {
          this.sampleMemory();
        }, this.sampleInterval);
      }
    }

    // 清理内存指标历史数据，只保留最近几条
    if (this.memoryMetrics.length > 10) {
      this.memoryMetrics = this.memoryMetrics.slice(-10);
    }
  }

  /**
   * 获取最新的内存指标
   */
  private getLatestMemoryMetric(): IMemoryMetric | null {
    if (this.memoryMetrics.length === 0) return null;
    return this.memoryMetrics[this.memoryMetrics.length - 1];
  }

  /**
   * 检查浏览器是否支持内存API
   */
  private isMemoryAPIAvailable(): boolean {
    return !!(window.performance && (window.performance as any).memory);
  }

  /**
   * 获取内存使用趋势
   * @returns 内存使用趋势数据
   */
  public getMemoryTrend(): IMemoryMetric[] {
    return [...this.memoryMetrics];
  }

  /**
   * 获取内存使用统计
   * @returns 内存统计数据
   */
  public getMemoryStats(): {
    average: number;
    max: number;
    min: number;
    current: number;
    trend: 'stable' | 'increasing' | 'decreasing';
  } {
    if (this.memoryMetrics.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        current: 0,
        trend: 'stable',
      };
    }

    const usedHeapSizes = this.memoryMetrics.map((m) => m.usedJSHeapSize);
    const totalSum = usedHeapSizes.reduce((a, b) => a + b, 0);
    const current = usedHeapSizes[usedHeapSizes.length - 1];
    const max = Math.max(...usedHeapSizes);
    const min = Math.min(...usedHeapSizes);
    const average = totalSum / usedHeapSizes.length;

    // 计算趋势
    const recentSamples = this.memoryMetrics.slice(-5);
    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < recentSamples.length; i++) {
      if (recentSamples[i].usedJSHeapSize > recentSamples[i - 1].usedJSHeapSize) {
        increasing++;
      } else if (recentSamples[i].usedJSHeapSize < recentSamples[i - 1].usedJSHeapSize) {
        decreasing++;
      }
    }

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (increasing > decreasing && increasing > 1) {
      trend = 'increasing';
    } else if (decreasing > increasing && decreasing > 1) {
      trend = 'decreasing';
    }

    return {
      average,
      max,
      min,
      current,
      trend,
    };
  }

  /**
   * 提供API给外部使用
   */
  public override getApi(): Record<string, unknown> {
    return {
      getMemoryTrend: this.getMemoryTrend.bind(this),
      getMemoryStats: this.getMemoryStats.bind(this),
      isMemoryAPIAvailable: this.isMemoryAPIAvailable.bind(this),
    };
  }
}

// 创建插件实例
const memoryMonitorPlugin = new MemoryMonitorPlugin();

export default memoryMonitorPlugin;
