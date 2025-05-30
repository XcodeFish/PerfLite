import { BasePlugin } from '../interface';

interface IReactProfilerData {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Array<{
    id: number;
    name: string;
    timestamp: number;
  }>;
}

/**
 * React性能分析插件
 *
 * 使用React Profiler API分析React组件性能
 */
export class ReactProfilerPlugin extends BasePlugin<unknown> {
  private isReactAvailable: boolean = false;
  private isProfilerEnabled: boolean = false;
  private profileData: IReactProfilerData[] = [];
  private ReactDOM: any = null;
  private React: any = null;
  private maxProfilerEntries = 100;
  private slowRenderThreshold = 16; // 16ms - 一帧的时间
  private isInitialized = false;
  private originalCreateElement: any = null;
  private componentRenderCounts: Map<string, number> = new Map();
  private componentRenderDurations: Map<string, number[]> = new Map();

  constructor() {
    super(
      'react-profiler',
      '1.0.0',
      {
        init: async (config?: unknown) => {
          if (config && typeof config === 'object') {
            const typedConfig = config as {
              slowRenderThreshold?: number;
              maxProfilerEntries?: number;
            };

            if (typedConfig.slowRenderThreshold) {
              this.slowRenderThreshold = typedConfig.slowRenderThreshold;
            }

            if (typedConfig.maxProfilerEntries) {
              this.maxProfilerEntries = typedConfig.maxProfilerEntries;
            }
          }

          this.checkReactAvailability();

          if (this.isReactAvailable) {
            this.setupProfiler();
          }
        },

        destroy: async () => {
          this.disableProfiler();
        },

        beforeSend: (data) => {
          if (data && typeof data === 'object' && 'type' in data) {
            if (data.type === 'error' || data.type === 'performance') {
              // 如果是React相关错误或性能信息，添加React组件数据
              const reactData = this.getReactPerformanceInfo();

              if (reactData) {
                return {
                  ...data,
                  reactInfo: reactData,
                };
              }
            }
          }

          return data;
        },

        onInitialized: () => {
          if (this.isReactAvailable && !this.isInitialized) {
            this.setupProfiler();
          }
        },
      },
      {
        name: 'react-profiler',
        version: '1.0.0',
        enabled: true,
        priority: 80,
        dependencies: [],
      },
      {
        name: 'react-profiler',
        version: '1.0.0',
        description: 'React性能分析插件',
        author: 'PerfLite Team',
        category: 'framework',
        tags: ['react', 'performance', 'profiling'],
      }
    );
  }

  /**
   * 检查React是否可用
   */
  private checkReactAvailability(): void {
    try {
      this.React = (window as any).React;
      this.ReactDOM = (window as any).ReactDOM;
      this.isReactAvailable = !!(this.React && this.ReactDOM && this.React.Profiler);

      if (!this.isReactAvailable) {
        console.warn('React Profiler API is not available. React version 16.5+ is required.');
      }
    } catch (error) {
      console.warn('React is not found in the current environment.', error);
      this.isReactAvailable = false;
    }
  }

  /**
   * 设置React Profiler
   */
  private setupProfiler(): void {
    if (!this.isReactAvailable || this.isInitialized) return;

    // 保存原始createElement函数
    this.originalCreateElement = this.React.createElement;

    // 包装createElement以监控组件创建
    this.React.createElement = (...args: any[]) => {
      const element = this.originalCreateElement.apply(this.React, args);

      // 记录组件渲染次数
      if (typeof args[0] === 'function' || typeof args[0] === 'object') {
        const componentName = this.getComponentName(args[0]);
        if (componentName && !componentName.startsWith('React')) {
          const currentCount = this.componentRenderCounts.get(componentName) || 0;
          this.componentRenderCounts.set(componentName, currentCount + 1);
        }
      }

      return element;
    };

    // 设置为已初始化
    this.isInitialized = true;
    this.isProfilerEnabled = true;

    console.info('React Profiler is now enabled. Monitoring React component performance.');
  }

  /**
   * 禁用React Profiler
   */
  private disableProfiler(): void {
    if (!this.isInitialized) return;

    // 恢复原始createElement
    if (this.originalCreateElement) {
      this.React.createElement = this.originalCreateElement;
    }

    this.isInitialized = false;
    this.isProfilerEnabled = false;

    console.info('React Profiler has been disabled.');
  }

  /**
   * 获取组件名称
   * @param component React组件
   * @returns 组件名称
   */
  private getComponentName(component: any): string {
    if (!component) return 'Unknown';

    return (
      component.displayName ||
      component.name ||
      (component.type && (component.type.displayName || component.type.name)) ||
      'Anonymous'
    );
  }

  /**
   * 处理Profiler回调
   * @param id Profiler ID
   * @param phase 阶段
   * @param actualDuration 实际持续时间
   * @param baseDuration 基础持续时间
   * @param startTime 开始时间
   * @param commitTime 提交时间
   * @param interactions 交互
   */
  private handleProfilerCallback(
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: any
  ): void {
    // 记录性能数据
    const profilerData: IReactProfilerData = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions: interactions ? Array.from(interactions) : [],
    };

    // 记录组件渲染耗时
    const durations = this.componentRenderDurations.get(id) || [];
    durations.push(actualDuration);

    // 只保留最近的记录
    if (durations.length > 10) {
      durations.shift();
    }

    this.componentRenderDurations.set(id, durations);

    // 添加到性能数据数组
    this.profileData.push(profilerData);

    // 限制数组大小
    if (this.profileData.length > this.maxProfilerEntries) {
      this.profileData.shift();
    }

    // 检测慢渲染并发出警告
    if (actualDuration > this.slowRenderThreshold) {
      this.emit('slowRenderDetected', {
        component: id,
        actualDuration,
        baseDuration,
        phase,
        timestamp: Date.now(),
      });

      // 发出警告日志
      const duration = Math.round(actualDuration);
      const threshold = this.slowRenderThreshold;
      console.warn(
        `Slow render detected in component "${id}": ${duration}ms (threshold: ${threshold}ms)`
      );
    }
  }

  /**
   * 创建Profiler包装组件
   * @param componentId 组件ID
   * @param children 子组件
   * @returns Profiler包装的组件
   */
  public createProfilerWrapper(componentId: string, children: any): any {
    if (!this.isReactAvailable || !this.isProfilerEnabled) return children;

    return this.React.createElement(
      this.React.Profiler,
      {
        id: componentId,
        onRender: this.handleProfilerCallback.bind(this),
      },
      children
    );
  }

  /**
   * 获取React性能信息
   * @returns React性能数据
   */
  public getReactPerformanceInfo(): {
    topSlowComponents: Array<{ name: string; avgDuration: number; renderCount: number }>;
    mostReRenderedComponents: Array<{ name: string; renderCount: number }>;
    totalComponents: number;
    profileSamples: IReactProfilerData[];
  } | null {
    if (!this.isReactAvailable || !this.isProfilerEnabled) return null;

    // 计算平均渲染时间
    const avgRenderTimes = new Map<string, number>();

    this.componentRenderDurations.forEach((durations, componentId) => {
      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0);
        avgRenderTimes.set(componentId, sum / durations.length);
      }
    });

    // 获取渲染最慢的组件
    const slowComponents = Array.from(avgRenderTimes.entries())
      .map(([name, avgDuration]) => ({
        name,
        avgDuration,
        renderCount: this.componentRenderCounts.get(name) || 0,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    // 获取重新渲染最多的组件
    const mostReRendered = Array.from(this.componentRenderCounts.entries())
      .map(([name, count]) => ({ name, renderCount: count }))
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 5);

    return {
      topSlowComponents: slowComponents,
      mostReRenderedComponents: mostReRendered,
      totalComponents: this.componentRenderCounts.size,
      profileSamples: this.profileData.slice(-10), // 只发送最近的10条记录
    };
  }

  /**
   * 重置性能数据
   */
  public resetProfileData(): void {
    this.profileData = [];
    this.componentRenderCounts.clear();
    this.componentRenderDurations.clear();
  }

  /**
   * 提供API给外部使用
   */
  public override getApi(): Record<string, unknown> {
    return {
      isReactAvailable: () => this.isReactAvailable,
      createProfilerWrapper: this.createProfilerWrapper.bind(this),
      getReactPerformanceInfo: this.getReactPerformanceInfo.bind(this),
      resetProfileData: this.resetProfileData.bind(this),
      setSlowRenderThreshold: (threshold: number) => {
        if (typeof threshold === 'number' && threshold > 0) {
          this.slowRenderThreshold = threshold;
          return true;
        }
        return false;
      },
    };
  }
}

// 创建插件实例
const reactProfilerPlugin = new ReactProfilerPlugin();

export default reactProfilerPlugin;
