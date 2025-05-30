/* eslint-disable indent */
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

interface IReactPerformanceIssue {
  type:
    | 'excessive-renders'
    | 'slow-render'
    | 'cascading-updates'
    | 'high-memory'
    | 'state-thrashing';
  componentName: string;
  severity: 'high' | 'medium' | 'low';
  count: number;
  metric: number;
  suggestion: string;
}

/**
 * React性能分析插件
 *
 * 使用React Profiler API分析React组件性能，支持React 16.5+，包括React 18 Concurrent Mode
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
  private componentUpdateTimestamps: Map<string, number[]> = new Map();
  private componentPropChanges: Map<string, number> = new Map();
  private componentStateChanges: Map<string, number> = new Map();
  private performanceIssues: IReactPerformanceIssue[] = [];
  private reactVersion: string = 'unknown';
  private isConcurrentMode: boolean = false;
  private lastComponentTree: Map<string, Set<string>> = new Map();

  constructor() {
    super(
      'react-profiler',
      '1.1.0', // 版本更新
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
        version: '1.1.0',
        enabled: true,
        priority: 80,
        dependencies: [],
      },
      {
        name: 'react-profiler',
        version: '1.1.0',
        description: 'React性能分析插件（增强版，支持React 18和自动性能问题检测）',
        author: 'PerfLite Team',
        category: 'framework',
        tags: ['react', 'performance', 'profiling', 'concurrent-mode'],
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

      if (this.isReactAvailable) {
        // 检测React版本
        this.reactVersion = this.React.version || 'unknown';

        // 检测是否为React 18+
        this.isConcurrentMode =
          parseInt(this.reactVersion.split('.')[0]) >= 18 || !!this.ReactDOM.createRoot;

        console.info(
          `React版本: ${this.reactVersion}, Concurrent Mode: ${this.isConcurrentMode ? '可用' : '不可用'}`
        );
      } else {
        console.warn('React Profiler API不可用。需要React 16.5+版本。');
      }
    } catch (error) {
      console.warn('当前环境中未找到React。', error);
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

          // 记录组件更新时间戳
          const timestamps = this.componentUpdateTimestamps.get(componentName) || [];
          timestamps.push(Date.now());
          if (timestamps.length > 100) timestamps.shift(); // 保持最多100条记录
          this.componentUpdateTimestamps.set(componentName, timestamps);

          // 记录组件树结构（父子关系）
          this.recordComponentTree(args);

          // 添加props变化监控
          if (args[1] && typeof args[1] === 'object') {
            this.trackPropChanges(componentName, args[1]);
          }
        }
      }

      return element;
    };

    // 如果是React 18，添加对createRoot的监控
    if (this.isConcurrentMode && this.ReactDOM.createRoot) {
      const originalCreateRoot = this.ReactDOM.createRoot;
      this.ReactDOM.createRoot = (container: any, options: any) => {
        const root = originalCreateRoot.call(this.ReactDOM, container, options);

        // 如果有原始render方法，添加监控
        if (root.render) {
          const originalRender = root.render;
          root.render = (element: any) => {
            // 在渲染前后测量性能
            const startTime = performance.now();
            const result = originalRender.call(root, element);
            const endTime = performance.now();

            // 记录渲染性能数据
            this.handleRootRender('root', endTime - startTime);

            return result;
          };
        }

        return root;
      };
    }

    // 向React开发者工具注册性能分析器
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      const originalOnCommitFiberRoot = hook.onCommitFiberRoot;

      if (originalOnCommitFiberRoot) {
        hook.onCommitFiberRoot = (id: any, root: any, ...args: any[]) => {
          // 分析commit的性能
          this.analyzeCommit(root);

          // 调用原始方法
          return originalOnCommitFiberRoot(id, root, ...args);
        };
      }
    }

    // 设置为已初始化
    this.isInitialized = true;
    this.isProfilerEnabled = true;

    console.info(
      `React性能监控已启用。版本: ${this.reactVersion}, 
      Concurrent Mode: ${this.isConcurrentMode ? '可用' : '不可用'}`
    );
    this.schedulePeriodicAnalysis();
  }

  /**
   * 记录组件树结构
   */
  private recordComponentTree(args: any[]): void {
    try {
      if (args.length < 3) return;

      const componentName = this.getComponentName(args[0]);
      if (!componentName || componentName.startsWith('React')) return;

      // 分析子组件
      const children = args[2];
      if (!children) return;

      const childComponents = new Set<string>();

      // 处理单个子元素
      if (this.React.isValidElement(children)) {
        const childType = children.type;
        const childName = this.getComponentName(childType);
        if (childName && !childName.startsWith('React')) {
          childComponents.add(childName);
        }
      }
      // 处理多个子元素
      else if (Array.isArray(children)) {
        children.forEach((child) => {
          if (this.React.isValidElement(child)) {
            const childType = child.type;
            const childName = this.getComponentName(childType);
            if (childName && !childName.startsWith('React')) {
              childComponents.add(childName);
            }
          }
        });
      }

      this.lastComponentTree.set(componentName, childComponents);
    } catch (e) {
      console.error('记录组件树结构失败', e);
    }
  }

  /**
   * 跟踪props变化
   */
  private trackPropChanges(componentName: string, props: any): void {
    const propsKey = `${componentName}:props`;
    const lastProps = this.getFromCache(propsKey);

    if (lastProps) {
      const changes = this.countObjectChanges(lastProps, props);
      const currentChanges = this.componentPropChanges.get(componentName) || 0;
      this.componentPropChanges.set(componentName, currentChanges + changes);
    }

    this.saveToCache(propsKey, { ...props });
  }

  /**
   * 跟踪state变化
   */
  private trackStateChanges(componentName: string, fiberNode: any): void {
    try {
      if (!fiberNode || !fiberNode.memoizedState) return;

      const stateKey = `${componentName}:state`;
      const lastStateSnapshot = this.getFromCache(stateKey);
      const currentState = this.extractStateFromFiber(fiberNode);

      if (lastStateSnapshot && currentState) {
        const changes = this.countObjectChanges(lastStateSnapshot, currentState);
        const currentChanges = this.componentStateChanges.get(componentName) || 0;
        this.componentStateChanges.set(componentName, currentChanges + changes);
      }

      if (currentState) {
        this.saveToCache(stateKey, currentState);
      }
    } catch (e) {
      console.error('跟踪state变化失败', e);
    }
  }

  /**
   * 从Fiber节点提取状态
   */
  private extractStateFromFiber(fiber: any): Record<string, any> | null {
    try {
      if (!fiber || !fiber.memoizedState) return null;

      // 尝试提取hooks状态
      const hooksState: Record<string, any> = {};
      let hookIndex = 0;
      let currentHook = fiber.memoizedState;

      while (currentHook) {
        // 提取useState和useReducer的值
        if (currentHook.memoizedState !== undefined) {
          hooksState[`state${hookIndex}`] = currentHook.memoizedState;
        }

        hookIndex++;
        currentHook = currentHook.next;
      }

      return hooksState;
    } catch (e) {
      console.error('从Fiber提取状态失败', e);
      return null;
    }
  }

  /**
   * 计算两个对象之间的变化数量
   */
  private countObjectChanges(prev: any, current: any): number {
    let changes = 0;

    // 检查移除的属性
    Object.keys(prev).forEach((key) => {
      if (!(key in current)) changes++;
    });

    // 检查添加或修改的属性
    Object.keys(current).forEach((key) => {
      if (!(key in prev)) {
        changes++;
      } else if (JSON.stringify(prev[key]) !== JSON.stringify(current[key])) {
        changes++;
      }
    });

    return changes;
  }

  /**
   * 分析React commit
   */
  private analyzeCommit(root: any): void {
    try {
      if (!root || !root.current) return;

      const visitFiber = (fiber: any, parentName: string | null) => {
        if (!fiber) return;

        // 获取组件名称
        const componentName = this.getComponentDisplayNameFromFiber(fiber);

        if (componentName && !componentName.startsWith('React')) {
          // 记录状态变化
          this.trackStateChanges(componentName, fiber);

          // 分析是否有re-render问题
          if (fiber.alternate) {
            // 分析props是否没有变化但组件重新渲染了
            const propsEqual = this.arePropsEqual(
              fiber.alternate.memoizedProps,
              fiber.memoizedProps
            );
            const stateEqual = this.areStateEqual(
              fiber.alternate.memoizedState,
              fiber.memoizedState
            );

            if (propsEqual && stateEqual && parentName) {
              // 组件可能不必要地重新渲染了
              this.recordPotentialIssue({
                type: 'excessive-renders',
                componentName,
                severity: 'medium',
                count: 1,
                metric: 0,
                suggestion:
                  `组件'${componentName}'在props和state没有变化的情况下重新渲染了。` +
                  '考虑使用React.memo、useMemo或shouldComponentUpdate来优化。',
              });
            }
          }
        }

        // 递归访问子节点
        if (fiber.child) {
          visitFiber(fiber.child, componentName);
        }

        // 递归访问兄弟节点
        if (fiber.sibling) {
          visitFiber(fiber.sibling, parentName);
        }
      };

      // 从根节点开始分析
      visitFiber(root.current, null);
    } catch (e) {
      console.error('分析React commit失败', e);
    }
  }

  /**
   * 从Fiber获取组件显示名称
   */
  private getComponentDisplayNameFromFiber(fiber: any): string | null {
    try {
      if (!fiber) return null;

      // 函数组件或类组件
      if (fiber.type) {
        return this.getComponentName(fiber.type);
      }

      return null;
    } catch (e) {
      console.error('从Fiber获取组件显示名称失败', e);
      return null;
    }
  }

  /**
   * 比较props是否相等
   */
  private arePropsEqual(prevProps: any, nextProps: any): boolean {
    if (prevProps === nextProps) return true;
    if (!prevProps || !nextProps) return false;

    try {
      // 简单比较props的JSON表示
      return JSON.stringify(prevProps) === JSON.stringify(nextProps);
    } catch (e) {
      console.error('比较props是否相等失败', e);
      return false;
    }
  }

  /**
   * 比较state是否相等
   */
  private areStateEqual(prevState: any, nextState: any): boolean {
    if (prevState === nextState) return true;
    if (!prevState || !nextState) return false;

    try {
      // 对于hooks链表，逐个比较
      let currentPrev = prevState;
      let currentNext = nextState;

      while (currentPrev && currentNext) {
        // 比较memoizedState (useState的值)
        if (
          JSON.stringify(currentPrev.memoizedState) !== JSON.stringify(currentNext.memoizedState)
        ) {
          return false;
        }

        currentPrev = currentPrev.next;
        currentNext = currentNext.next;
      }

      // 如果链表长度不同，则state不同
      return currentPrev === currentNext;
    } catch (e) {
      console.error('比较state是否相等失败', e);
      return false;
    }
  }

  /**
   * 处理Root渲染性能
   */
  private handleRootRender(id: string, duration: number): void {
    if (duration > this.slowRenderThreshold * 2) {
      this.recordPotentialIssue({
        type: 'slow-render',
        componentName: 'Root',
        severity: 'high',
        count: 1,
        metric: duration,
        suggestion: `根组件渲染时间为${duration.toFixed(2)}ms，远高于16ms目标。检查初始渲染性能或使用性能分析工具。`,
      });
    }
  }

  /**
   * 定期分析性能问题
   */
  private schedulePeriodicAnalysis(): void {
    setInterval(() => {
      this.analyzePerformanceIssues();
    }, 10000); // 每10秒分析一次
  }

  /**
   * 分析可能的性能问题
   */
  private analyzePerformanceIssues(): void {
    // 分析高频渲染组件
    this.componentRenderCounts.forEach((count, component) => {
      const timestamps = this.componentUpdateTimestamps.get(component) || [];

      if (timestamps.length > 20) {
        // 计算最近20次渲染的平均间隔
        let totalInterval = 0;
        for (let i = 1; i < timestamps.length; i++) {
          totalInterval += timestamps[i] - timestamps[i - 1];
        }
        const avgInterval = totalInterval / (timestamps.length - 1);

        // 如果平均间隔小于100ms，可能是渲染过于频繁
        if (avgInterval < 100) {
          this.recordPotentialIssue({
            type: 'excessive-renders',
            componentName: component,
            severity: 'high',
            count: timestamps.length,
            metric: avgInterval,
            suggestion:
              `组件'${component}'在短时间内频繁渲染(平均间隔${avgInterval.toFixed(2)}ms)。` +
              '检查是否存在不必要的状态更新或优化memo/useMemo使用。',
          });
        }
      }

      // 检查级联更新
      const children = this.lastComponentTree.get(component);
      if (children && children.size > 0) {
        const parentUpdates = timestamps.length;
        let cascadingUpdates = 0;

        children.forEach((child) => {
          const childTimestamps = this.componentUpdateTimestamps.get(child) || [];
          // 检查每次父组件更新后是否立即触发了子组件更新
          for (const parentTime of timestamps) {
            for (const childTime of childTimestamps) {
              if (childTime - parentTime > 0 && childTime - parentTime < 16) {
                cascadingUpdates++;
              }
            }
          }
        });

        if (cascadingUpdates > parentUpdates * 0.8) {
          this.recordPotentialIssue({
            type: 'cascading-updates',
            componentName: component,
            severity: 'medium',
            count: cascadingUpdates,
            metric: 0,
            suggestion: `组件'${component}'导致子组件频繁级联更新。考虑使用React.memo或将状态下移到需要它的组件中。`,
          });
        }
      }

      // 检查state变化频率
      const stateChanges = this.componentStateChanges.get(component) || 0;
      if (stateChanges > 50) {
        this.recordPotentialIssue({
          type: 'state-thrashing',
          componentName: component,
          severity: 'medium',
          count: stateChanges,
          metric: 0,
          suggestion: `组件'${component}'状态变化非常频繁(${stateChanges}次)。考虑使用useMemo、useCallback或批处理更新。`,
        });
      }
    });

    // 对性能问题进行去重和排序
    this.deduplicateAndSortIssues();
  }

  /**
   * 记录潜在性能问题
   */
  private recordPotentialIssue(issue: IReactPerformanceIssue): void {
    // 只保留最新的200个问题
    if (this.performanceIssues.length >= 200) {
      this.performanceIssues.shift();
    }
    this.performanceIssues.push(issue);
  }

  /**
   * 去重和排序性能问题
   */
  private deduplicateAndSortIssues(): void {
    const issueMap = new Map<string, IReactPerformanceIssue>();

    // 合并相同组件和类型的问题
    for (const issue of this.performanceIssues) {
      const key = `${issue.componentName}-${issue.type}`;
      const existing = issueMap.get(key);

      if (existing) {
        // 更新计数和度量值
        existing.count += issue.count;
        existing.metric =
          issue.metric > 0 ? Math.max(existing.metric, issue.metric) : existing.metric;

        // 提升严重性，如果问题持续存在
        if (existing.severity === 'low' && existing.count > 10) {
          existing.severity = 'medium';
        } else if (existing.severity === 'medium' && existing.count > 30) {
          existing.severity = 'high';
        }
      } else {
        issueMap.set(key, { ...issue });
      }
    }

    // 排序问题：高严重性优先
    this.performanceIssues = Array.from(issueMap.values()).sort((a, b) => {
      // 首先按严重性排序
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // 然后按计数排序
      return b.count - a.count;
    });
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

    console.info('React Profiler已禁用。');
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
    // 保存性能数据
    const profileInfo: IReactProfilerData = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions: Array.isArray(interactions)
        ? interactions.map((interaction) => ({
            id: interaction.id,
            name: interaction.name,
            timestamp: interaction.timestamp,
          }))
        : [],
    };

    // 添加到性能数据集合
    this.profileData.push(profileInfo);

    // 限制集合大小
    if (this.profileData.length > this.maxProfilerEntries) {
      this.profileData.shift();
    }

    // 记录组件渲染时间
    const durations = this.componentRenderDurations.get(id) || [];
    durations.push(actualDuration);

    // 只保留最近的20个记录
    if (durations.length > 20) {
      durations.shift();
    }

    this.componentRenderDurations.set(id, durations);

    // 检测慢渲染
    if (actualDuration > this.slowRenderThreshold) {
      this.recordPotentialIssue({
        type: 'slow-render',
        componentName: id,
        severity: actualDuration > this.slowRenderThreshold * 2 ? 'high' : 'medium',
        count: 1,
        metric: actualDuration,
        suggestion: `组件'${id}'渲染时间为${actualDuration.toFixed(2)}ms，高于16ms帧预算。考虑拆分组件或使用React.memo优化。`,
      });
    }
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any {
    try {
      const cachedData = sessionStorage.getItem(`perflite_react_${key}`);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (e) {
      console.error('从缓存获取数据失败', e);
      return null;
    }
  }

  /**
   * 保存数据到缓存
   */
  private saveToCache(key: string, data: any): void {
    try {
      sessionStorage.setItem(`perflite_react_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error('保存数据到缓存失败', e);
    }
  }

  /**
   * 创建Profiler包装器
   * @param componentId 组件ID
   * @param children 子元素
   * @returns React Profiler元素
   */
  public createProfilerWrapper(componentId: string, children: any): any {
    if (!this.isReactAvailable || !this.React.Profiler) {
      return children;
    }

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
   * @returns React性能信息
   */
  public getReactPerformanceInfo(): {
    topSlowComponents: Array<{ name: string; avgDuration: number; renderCount: number }>;
    mostReRenderedComponents: Array<{ name: string; renderCount: number }>;
    totalComponents: number;
    profileSamples: IReactProfilerData[];
    performanceIssues: IReactPerformanceIssue[];
    reactInfo: {
      version: string;
      isConcurrentMode: boolean;
    };
  } | null {
    if (!this.isReactAvailable || !this.isInitialized) {
      return null;
    }

    // 计算慢组件
    const topSlowComponents = Array.from(this.componentRenderDurations.entries())
      .map(([name, durations]) => ({
        name,
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        renderCount: this.componentRenderCounts.get(name) || 0,
      }))
      .filter((component) => component.avgDuration > this.slowRenderThreshold / 2)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // 计算最频繁渲染组件
    const mostReRenderedComponents = Array.from(this.componentRenderCounts.entries())
      .map(([name, count]) => ({ name, renderCount: count }))
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 10);

    return {
      topSlowComponents,
      mostReRenderedComponents,
      totalComponents: this.componentRenderCounts.size,
      profileSamples: this.profileData.slice(-20), // 最近20个样本
      performanceIssues: this.performanceIssues.slice(0, 10), // 最重要的10个问题
      reactInfo: {
        version: this.reactVersion,
        isConcurrentMode: this.isConcurrentMode,
      },
    };
  }

  /**
   * 重置性能数据
   */
  public resetProfileData(): void {
    this.profileData = [];
    this.componentRenderCounts.clear();
    this.componentRenderDurations.clear();
    this.componentUpdateTimestamps.clear();
    this.componentPropChanges.clear();
    this.componentStateChanges.clear();
    this.performanceIssues = [];
    this.lastComponentTree.clear();
  }

  /**
   * 获取插件API
   * @returns 插件API
   */
  public override getApi(): Record<string, unknown> {
    return {
      createProfiler: this.createProfilerWrapper.bind(this),
      getPerformanceInfo: this.getReactPerformanceInfo.bind(this),
      resetData: this.resetProfileData.bind(this),
      reactVersion: this.reactVersion,
      isConcurrentMode: this.isConcurrentMode,
      isProfilerEnabled: this.isProfilerEnabled,
    };
  }
}

// 创建插件实例
const reactProfilerPlugin = new ReactProfilerPlugin();

export default reactProfilerPlugin;
