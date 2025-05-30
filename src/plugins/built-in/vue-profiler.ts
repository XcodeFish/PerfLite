import { BasePlugin } from '../interface';

interface IVueProfilerData {
  componentName: string;
  renderTime: number;
  updateCount: number;
  timestamp: number;
  instanceId: string;
  parentComponentName?: string;
}

/**
 * Vue性能分析插件
 *
 * 使用Vue性能API分析Vue组件性能
 */
export class VueProfilerPlugin extends BasePlugin<unknown> {
  private isVueAvailable: boolean = false;
  private isVue3: boolean = false;
  private isProfilerEnabled: boolean = false;
  private profileData: IVueProfilerData[] = [];
  private Vue: any = null;
  private maxProfilerEntries = 100;
  private slowRenderThreshold = 16; // 16ms - 一帧的时间
  private isInitialized = false;
  private componentRenderCounts: Map<string, number> = new Map();
  private componentRenderDurations: Map<string, number[]> = new Map();
  private originalComponentOptions: any = null;
  private originalMount: any = null;
  private originalCreateApp: any = null;

  constructor() {
    super(
      'vue-profiler',
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

          this.checkVueAvailability();

          if (this.isVueAvailable) {
            this.setupProfiler();
          }
        },

        destroy: async () => {
          this.disableProfiler();
        },

        beforeSend: (data) => {
          if (data && typeof data === 'object' && 'type' in data) {
            if (data.type === 'error' || data.type === 'performance') {
              // 如果是Vue相关错误或性能信息，添加Vue组件数据
              const vueData = this.getVuePerformanceInfo();

              if (vueData) {
                return {
                  ...data,
                  vueInfo: vueData,
                };
              }
            }
          }

          return data;
        },

        onInitialized: () => {
          if (this.isVueAvailable && !this.isInitialized) {
            this.setupProfiler();
          }
        },
      },
      {
        name: 'vue-profiler',
        version: '1.0.0',
        enabled: true,
        priority: 80,
        dependencies: [],
      },
      {
        name: 'vue-profiler',
        version: '1.0.0',
        description: 'Vue性能分析插件',
        author: 'PerfLite Team',
        category: 'framework',
        tags: ['vue', 'performance', 'profiling'],
      }
    );
  }

  /**
   * 检查Vue是否可用
   */
  private checkVueAvailability(): void {
    try {
      // 检测Vue 3
      if ((window as any).Vue && (window as any).Vue.createApp) {
        this.Vue = (window as any).Vue;
        this.isVue3 = true;
        this.isVueAvailable = true;
        return;
      }

      // 检测Vue 2
      if (
        (window as any).Vue &&
        (window as any).Vue.version &&
        (window as any).Vue.version.startsWith('2.')
      ) {
        this.Vue = (window as any).Vue;
        this.isVue3 = false;
        this.isVueAvailable = true;
        return;
      }

      if (!this.isVueAvailable) {
        console.warn('Vue is not found in the current environment.');
      }
    } catch (error) {
      console.warn('Error detecting Vue:', error);
      this.isVueAvailable = false;
    }
  }

  /**
   * 设置Vue Profiler
   */
  private setupProfiler(): void {
    if (!this.isVueAvailable || this.isInitialized) return;

    if (this.isVue3) {
      this.setupVue3Profiler();
    } else {
      this.setupVue2Profiler();
    }

    // 设置为已初始化
    this.isInitialized = true;
    this.isProfilerEnabled = true;

    console.info('Vue Profiler is now enabled. Monitoring Vue component performance.');
  }

  /**
   * 设置Vue 3 Profiler
   */
  private setupVue3Profiler(): void {
    // 保存原始createApp函数
    this.originalCreateApp = this.Vue.createApp;

    // 重写createApp方法以便注入性能监控
    this.Vue.createApp = (...args: any[]) => {
      const app = this.originalCreateApp.apply(this.Vue, args);

      // 保存原始mount方法
      const originalMount = app.mount;

      // 重写mount方法以捕获组件挂载
      app.mount = (...mountArgs: any[]) => {
        // 添加全局性能监控
        app.mixin({
          beforeCreate() {
            const componentName = this.$options.name || 'Anonymous';
            const instanceId =
              `${componentName}-${Date.now()}-` + `${Math.random().toString(36).substr(2, 9)}`;

            this.__perflite_instance_id = instanceId;
            this.__perflite_render_start = 0;
          },

          beforeMount() {
            this.__perflite_render_start = performance.now();
          },

          mounted() {
            if (this.__perflite_render_start) {
              const renderTime = performance.now() - this.__perflite_render_start;
              const componentName = this.$options.name || 'Anonymous';
              const parentName = this.$parent?.$options?.name;

              // 记录组件渲染次数
              const currentCount = this.componentRenderCounts.get(componentName) || 0;
              this.componentRenderCounts.set(componentName, currentCount + 1);

              // 记录渲染耗时
              const durations = this.componentRenderDurations.get(componentName) || [];
              durations.push(renderTime);

              // 只保留最近的记录
              if (durations.length > 10) {
                durations.shift();
              }

              this.componentRenderDurations.set(componentName, durations);

              // 添加到性能数据
              this.addProfileData({
                componentName,
                renderTime,
                updateCount: 1,
                timestamp: Date.now(),
                instanceId: this.__perflite_instance_id,
                parentComponentName: parentName,
              });
            }
          },

          beforeUpdate() {
            this.__perflite_render_start = performance.now();
          },

          updated() {
            if (this.__perflite_render_start) {
              const renderTime = performance.now() - this.__perflite_render_start;
              const componentName = this.$options.name || 'Anonymous';

              // 获取当前更新次数
              const currentCount = this.componentRenderCounts.get(componentName) || 0;
              this.componentRenderCounts.set(componentName, currentCount + 1);

              // 记录更新耗时
              const durations = this.componentRenderDurations.get(componentName) || [];
              durations.push(renderTime);

              // 只保留最近的记录
              if (durations.length > 10) {
                durations.shift();
              }

              this.componentRenderDurations.set(componentName, durations);

              // 添加到性能数据
              this.addProfileData({
                componentName,
                renderTime,
                updateCount: currentCount + 1,
                timestamp: Date.now(),
                instanceId: this.__perflite_instance_id,
              });

              // 检测慢渲染
              if (renderTime > this.slowRenderThreshold) {
                this.emit('slowRenderDetected', {
                  component: componentName,
                  renderTime,
                  timestamp: Date.now(),
                });
              }
            }
          },
        });

        return originalMount.apply(app, mountArgs);
      };

      return app;
    };
  }

  /**
   * 设置Vue 2 Profiler
   */
  private setupVue2Profiler(): void {
    // 保存原始Vue.component
    this.originalComponentOptions = this.Vue.options.components;

    // 扩展Vue的config对象，添加性能跟踪
    const originalComponent = this.Vue.component;

    this.Vue.component = (name: string, definition: any) => {
      if (typeof definition === 'function') {
        // 异步组件或直接导出的组件函数
        const originalDefinition = definition;
        definition = function (this: any, ...args: any[]) {
          const result = originalDefinition.apply(this, args);
          // 为异步加载的组件添加性能钩子
          return this.addVue2Hooks(result, name);
        };
      } else if (definition) {
        // 组件选项对象
        definition = this.addVue2Hooks(definition, name);
      }

      // 调用原始Vue.component
      return originalComponent.call(this.Vue, name, definition);
    };

    // 添加全局混入，监控所有组件
    // 创建一个闭包，通过专用方法访问插件实例
    const getPluginInstance = () => this;
    this.Vue.mixin({
      beforeCreate: function () {
        const componentName = this.$options.name || 'Anonymous';
        const instanceId =
          `${componentName}-${Date.now()}-` + `${Math.random().toString(36).substr(2, 9)}`;

        this.__perflite_instance_id = instanceId;
        this.__perflite_render_start = 0;
      },
      beforeMount: function () {
        this.__perflite_render_start = performance.now();
      },
      mounted: function () {
        if (this.__perflite_render_start) {
          const renderTime = performance.now() - this.__perflite_render_start;
          const componentName = this.$options.name || 'Anonymous';

          // 记录组件渲染次数
          const currentCount = getPluginInstance().componentRenderCounts.get(componentName) || 0;
          getPluginInstance().componentRenderCounts.set(componentName, currentCount + 1);

          // 记录渲染耗时
          const durations = getPluginInstance().componentRenderDurations.get(componentName) || [];
          durations.push(renderTime);

          // 只保留最近的记录
          if (durations.length > 10) {
            durations.shift();
          }

          getPluginInstance().componentRenderDurations.set(componentName, durations);

          // 添加到性能数据
          getPluginInstance().addProfileData({
            componentName,
            renderTime,
            updateCount: 1,
            timestamp: Date.now(),
            instanceId: this.__perflite_instance_id,
            parentComponentName: this.$parent?.$options?.name,
          });
        }
      },
      beforeUpdate: function () {
        this.__perflite_render_start = performance.now();
      },
      updated: function () {
        if (this.__perflite_render_start) {
          const renderTime = performance.now() - this.__perflite_render_start;
          const componentName = this.$options.name || 'Anonymous';

          // 获取当前更新次数
          const currentCount = getPluginInstance().componentRenderCounts.get(componentName) || 0;
          getPluginInstance().componentRenderCounts.set(componentName, currentCount + 1);

          // 记录更新耗时
          const durations = getPluginInstance().componentRenderDurations.get(componentName) || [];
          durations.push(renderTime);

          // 只保留最近的记录
          if (durations.length > 10) {
            durations.shift();
          }

          getPluginInstance().componentRenderDurations.set(componentName, durations);

          // 添加到性能数据
          getPluginInstance().addProfileData({
            componentName,
            renderTime,
            updateCount: currentCount + 1,
            timestamp: Date.now(),
            instanceId: this.__perflite_instance_id,
          });

          // 检测慢渲染
          if (renderTime > getPluginInstance().slowRenderThreshold) {
            getPluginInstance().emit('slowRenderDetected', {
              component: componentName,
              renderTime,
              timestamp: Date.now(),
            });
          }
        }
      },
    });
  }

  /**
   * 为Vue2组件添加性能钩子
   */
  private addVue2Hooks(options: any, name: string): any {
    if (!options) return options;

    // 确保组件有名称
    if (!options.name && typeof name === 'string') {
      options.name = name;
    }

    return options;
  }

  /**
   * 添加性能数据
   */
  private addProfileData(data: IVueProfilerData): void {
    this.profileData.push(data);

    // 限制数据量
    if (this.profileData.length > this.maxProfilerEntries) {
      this.profileData.shift();
    }
  }

  /**
   * 禁用Vue Profiler
   */
  private disableProfiler(): void {
    if (!this.isInitialized) return;

    // 恢复原始方法
    if (this.isVue3) {
      if (this.originalCreateApp) {
        this.Vue.createApp = this.originalCreateApp;
      }
    } else {
      if (this.originalComponentOptions) {
        this.Vue.options.components = this.originalComponentOptions;
      }
    }

    this.isInitialized = false;
    this.isProfilerEnabled = false;

    console.info('Vue Profiler has been disabled.');
  }

  /**
   * 获取Vue性能信息
   */
  public getVuePerformanceInfo(): {
    topSlowComponents: Array<{ name: string; avgDuration: number; renderCount: number }>;
    mostReRenderedComponents: Array<{ name: string; renderCount: number }>;
    totalComponents: number;
    profileSamples: IVueProfilerData[];
  } | null {
    if (!this.isVueAvailable || !this.isProfilerEnabled) {
      return null;
    }

    // 计算平均渲染时间
    const avgDurations = new Map<string, number>();
    this.componentRenderDurations.forEach((durations, component) => {
      const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      avgDurations.set(component, avgDuration);
    });

    // 提取最慢的组件
    const topSlowComponents = Array.from(avgDurations.entries())
      .map(([name, avgDuration]) => ({
        name,
        avgDuration,
        renderCount: this.componentRenderCounts.get(name) || 0,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    // 提取重新渲染最多的组件
    const mostReRenderedComponents = Array.from(this.componentRenderCounts.entries())
      .map(([name, renderCount]) => ({
        name,
        renderCount,
      }))
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 5);

    return {
      topSlowComponents,
      mostReRenderedComponents,
      totalComponents: this.componentRenderCounts.size,
      profileSamples: this.profileData.slice(-10), // 只返回最近10条记录
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
   * 获取API
   */
  public override getApi(): Record<string, unknown> {
    return {
      getVuePerformanceInfo: this.getVuePerformanceInfo.bind(this),
      resetProfileData: this.resetProfileData.bind(this),
    };
  }
}
