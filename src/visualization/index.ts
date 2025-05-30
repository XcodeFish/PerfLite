/* eslint-disable indent */
import {
  IVisualization,
  IRenderer,
  IChartData,
  IDashboardConfig,
  IChartOptions,
  IChartEvent,
  IWebGLRenderer,
  ICanvasRenderer,
} from '../types/visualization';
import { Dashboard } from './dashboard';
import { ChartAdapter } from './chart-adapter';
import { CanvasRenderer } from './renderers/canvas';
import { WebGLRenderer } from './renderers/webgl';

/**
 * 渲染器类型
 */
export type RendererType = 'webgl' | 'canvas' | 'auto';

/**
 * 渲染引擎管理器 - 负责选择和切换WebGL/Canvas渲染器
 */
export class RenderEngine {
  private container: HTMLElement | null = null;
  private webglRenderer: IWebGLRenderer;
  private canvasRenderer: ICanvasRenderer;
  private activeRenderer: IRenderer | null = null;
  private rendererType: RendererType = 'auto';
  private fallbackToCanvas: boolean = true;
  private currentData: IChartData = {};
  private currentOptions: IChartOptions | null = null;
  private isWebGLSupported: boolean = false;

  /**
   * 创建渲染引擎
   * @param container 容器元素
   * @param rendererType 渲染器类型
   */
  constructor(container?: HTMLElement, rendererType: RendererType = 'auto') {
    this.webglRenderer = new WebGLRenderer();
    this.canvasRenderer = new CanvasRenderer();
    this.rendererType = rendererType;

    if (container) {
      this.init(container);
    }
  }

  /**
   * 初始化渲染引擎
   * @param container 容器元素
   */
  public init(container: HTMLElement): void {
    this.container = container;

    // 检测WebGL支持
    this.isWebGLSupported = this.checkWebGLSupport();

    // 选择渲染器
    this.selectRenderer();

    // 初始化选中的渲染器
    if (this.activeRenderer && this.container) {
      this.activeRenderer.init(this.container);
    }
  }

  /**
   * 渲染图表
   * @param data 图表数据
   * @param options 图表选项
   */
  public render(data: IChartData, options: IChartOptions): void {
    this.currentData = data;
    this.currentOptions = options;

    if (this.activeRenderer) {
      this.activeRenderer.render(data, options);
    } else if (this.container) {
      // 如果没有活跃的渲染器，重新初始化
      this.init(this.container);
      this.render(data, options);
    }
  }

  /**
   * 更新图表数据
   * @param data 新的图表数据
   */
  public update(data: IChartData): void {
    this.currentData = data;

    if (this.activeRenderer && this.currentOptions) {
      this.activeRenderer.update(data);
    }
  }

  /**
   * 切换渲染器类型
   * @param type 渲染器类型
   */
  public switchRenderer(type: RendererType): void {
    if (this.rendererType === type) {
      return;
    }

    // 销毁当前渲染器
    if (this.activeRenderer) {
      this.activeRenderer.destroy();
    }

    this.rendererType = type;

    // 选择新的渲染器
    this.selectRenderer();

    // 初始化新渲染器并重新渲染
    if (this.activeRenderer && this.container) {
      this.activeRenderer.init(this.container);

      if (this.currentOptions) {
        this.render(this.currentData, this.currentOptions);
      }
    }
  }

  /**
   * 获取当前使用的渲染器类型
   */
  public getRendererType(): 'webgl' | 'canvas' {
    return this.activeRenderer instanceof WebGLRenderer ? 'webgl' : 'canvas';
  }

  /**
   * 获取当前渲染器
   */
  public getRenderer(): IRenderer | null {
    return this.activeRenderer;
  }

  /**
   * 获取WebGL渲染器（如果当前使用）
   */
  public getWebGLRenderer(): IWebGLRenderer | null {
    return this.activeRenderer instanceof WebGLRenderer ? this.activeRenderer : null;
  }

  /**
   * 获取Canvas渲染器（如果当前使用）
   */
  public getCanvasRenderer(): ICanvasRenderer | null {
    return this.activeRenderer instanceof CanvasRenderer ? this.activeRenderer : null;
  }

  /**
   * 调整渲染器大小
   */
  public resize(dimensions: { width: number; height: number }): void {
    if (this.activeRenderer) {
      this.activeRenderer.resize(dimensions);
    }
  }

  /**
   * 销毁渲染引擎
   */
  public destroy(): void {
    if (this.activeRenderer) {
      this.activeRenderer.destroy();
      this.activeRenderer = null;
    }

    this.container = null;
    this.currentData = {};
    this.currentOptions = null;
  }

  /**
   * 设置是否在WebGL不可用时回退到Canvas
   */
  public setFallbackToCanvas(fallback: boolean): void {
    this.fallbackToCanvas = fallback;

    // 如果设置为不回退但当前是回退状态，需要尝试切换回WebGL
    if (
      !fallback &&
      this.rendererType === 'webgl' &&
      this.activeRenderer instanceof CanvasRenderer
    ) {
      // 重新选择渲染器
      this.selectRenderer();

      // 重新初始化
      if (this.activeRenderer && this.container) {
        this.activeRenderer.init(this.container);

        if (this.currentOptions) {
          this.render(this.currentData, this.currentOptions);
        }
      }
    }
  }

  /**
   * 获取性能信息
   */
  public getPerformance(): { fps: number; renderTime: number; memoryUsage?: number } {
    if (this.activeRenderer) {
      return this.activeRenderer.getPerformance();
    }

    return { fps: 0, renderTime: 0 };
  }

  /**
   * 启用或禁用动画
   */
  public enableAnimation(enable: boolean): void {
    if (this.activeRenderer) {
      this.activeRenderer.enableAnimation(enable);
    }
  }

  /**
   * 选择适当的渲染器
   */
  private selectRenderer(): void {
    switch (this.rendererType) {
      case 'webgl':
        // 如果指定WebGL但不支持，根据fallback设置决定是否回退
        if (!this.isWebGLSupported) {
          if (this.fallbackToCanvas) {
            console.warn('WebGL不可用，回退到Canvas渲染');
            this.activeRenderer = this.canvasRenderer;
          } else {
            console.error('WebGL不可用，且未启用回退选项');
            this.activeRenderer = null;
          }
        } else {
          this.activeRenderer = this.webglRenderer;
        }
        break;

      case 'canvas':
        this.activeRenderer = this.canvasRenderer;
        break;

      case 'auto':
      default:
        // 自动选择最佳渲染器
        if (this.isWebGLSupported) {
          this.activeRenderer = this.webglRenderer;
        } else {
          this.activeRenderer = this.canvasRenderer;
        }
        break;
    }
  }

  /**
   * 检查WebGL支持
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (error) {
      console.warn('检测WebGL支持时出错:', error);
      return false;
    }
  }
}

/**
 * 可视化引擎主入口
 * 提供可视化核心功能接口
 */
export class Visualization implements IVisualization {
  private dashboard: Dashboard | null = null;
  private container: HTMLElement | null = null;
  private adapter: ChartAdapter | null = null;
  private renderers: Map<string, IRenderer> = new Map();
  private charts: Map<HTMLElement, unknown> = new Map();
  private currentTheme: 'light' | 'dark' | 'auto' = 'light';
  private dashboardData: IChartData = {};
  private dashboardConfig: IDashboardConfig | null = null;
  private eventListeners: Map<string, Set<(event: IChartEvent) => void>> = new Map();

  /**
   * 初始化可视化引擎
   * @param container 容器元素
   */
  public init(container: HTMLElement): void {
    this.container = container;
    this.dashboard = new Dashboard();
    this.adapter = new ChartAdapter();

    // 注册内置渲染器
    this.renderers.set('canvas', new CanvasRenderer());
    this.renderers.set('webgl', new WebGLRenderer());

    // 设置默认主题
    this.currentTheme = this.detectPreferredTheme();

    // 初始化仪表盘
    this.dashboard.init(container, 'canvas');

    // 绑定事件监听
    this.bindDashboardEvents();
  }

  /**
   * 渲染仪表盘
   * @param data 图表数据
   * @param config 仪表盘配置
   */
  public renderDashboard(data: IChartData, config: IDashboardConfig): void {
    if (!this.dashboard) return;

    this.dashboardData = data;
    this.dashboardConfig = config;
    this.currentTheme = config.theme;

    this.dashboard.render(data, config);
  }

  /**
   * 渲染单个图表
   * @param data 图表数据
   * @param options 图表选项
   * @param container 图表容器
   */
  public renderChart(data: IChartData, options: IChartOptions, container: HTMLElement): unknown {
    if (!this.adapter) {
      this.adapter = new ChartAdapter(options.theme === 'dark' ? 'webgl' : 'canvas');
    }

    const chart = this.adapter.createChart(container, options);
    this.adapter.updateChart(chart, data);

    this.charts.set(container, chart);
    return chart;
  }

  /**
   * 更新图表数据
   * @param chart 图表实例
   * @param data 新数据
   */
  public updateChart(chart: unknown, data: IChartData): void {
    if (!this.adapter) return;

    this.adapter.updateChart(chart, data);
  }

  /**
   * 设置主题
   * @param theme 主题
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.currentTheme = theme;

    if (this.dashboard && this.dashboardConfig) {
      this.dashboard.setTheme(theme);
    }

    // 更新所有独立图表
    for (const chart of this.charts.values()) {
      if (this.adapter) {
        this.adapter.setTheme(chart, theme);
      }
    }
  }

  /**
   * 销毁可视化引擎
   */
  public destroy(): void {
    // 销毁仪表盘
    if (this.dashboard) {
      this.dashboard.destroy();
    }

    // 销毁所有独立图表
    if (this.adapter) {
      for (const chart of this.charts.values()) {
        this.adapter.disposeChart(chart);
      }
    }

    this.charts.clear();
    this.container = null;
    this.dashboard = null;
    this.adapter = null;
    this.dashboardData = {};
    this.dashboardConfig = null;
    this.eventListeners.clear();
  }

  /**
   * 导出仪表盘
   * @param format 导出格式
   */
  public async exportDashboard(format: 'png' | 'jpg' | 'svg' | 'pdf' | 'json'): Promise<string> {
    if (!this.dashboard) {
      return '';
    }

    return this.dashboard.export(format);
  }

  /**
   * 注册自定义图表类型
   * @param type 图表类型
   * @param renderer 渲染器实例
   */
  public registerCustomChart(type: string, renderer: IRenderer): void {
    this.renderers.set(type, renderer);
  }

  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param callback 回调函数
   */
  public addEventListener(type: string, callback: (event: IChartEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    this.eventListeners.get(type)?.add(callback);

    // 同时添加到仪表盘
    if (this.dashboard) {
      this.dashboard.addEventListener(type, callback);
    }
  }

  /**
   * 移除事件监听器
   * @param type 事件类型
   * @param callback 回调函数
   */
  public removeEventListener(type: string, callback: (event: IChartEvent) => void): void {
    if (!this.eventListeners.has(type)) return;

    this.eventListeners.get(type)?.delete(callback);

    // 同时从仪表盘移除
    if (this.dashboard) {
      this.dashboard.removeEventListener(type, callback);
    }
  }

  /**
   * 获取仪表盘数据
   */
  public getDashboardData(): IChartData {
    return this.dashboardData;
  }

  /**
   * 获取仪表盘配置
   */
  public getDashboardConfig(): IDashboardConfig {
    return (
      this.dashboardConfig || {
        title: '',
        layout: 'grid',
        items: [],
        theme: 'light',
      }
    );
  }

  /**
   * 设置时间范围
   * @param start 开始时间
   * @param end 结束时间
   */
  public setTimeRange(start: number, end: number): void {
    if (this.dashboard) {
      this.dashboard.setTimeRange(start, end);
    }

    // 更新数据
    this.dashboardData.timeRange = { start, end };
  }

  /**
   * 应用筛选条件
   * @param filter 筛选条件
   */
  public applyFilter(filter: Record<string, unknown>): void {
    if (this.dashboard) {
      this.dashboard.applyFilter(filter);
    }
  }

  /**
   * 创建数据转换器
   * @param options 转换器选项
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public createDataTransformer(options: Record<string, unknown>): any {
    // 简单实现
    return {
      transform: (data: unknown) => {
        return data as IChartData;
      },
      getSchema: () => ({}),
      validate: () => true,
    };
  }

  /**
   * 获取性能统计信息
   */
  public getPerformanceStats(): {
    fps: number;
    renderTime: number;
    memoryUsage?: number;
    elements: number;
  } {
    const stats = {
      fps: 0,
      renderTime: 0,
      elements: this.charts.size,
    };

    // 简单实现
    if (this.adapter?.getAvailableChartTypes().includes('webgl')) {
      stats.fps = 60;
      stats.renderTime = 16;
    } else {
      stats.fps = 30;
      stats.renderTime = 33;
    }

    return stats;
  }

  /**
   * 绑定仪表盘事件监听
   */
  private bindDashboardEvents(): void {
    if (!this.dashboard) return;

    // 转发仪表盘事件
    const eventHandler = (event: IChartEvent) => {
      this.dispatchEvent(event);
    };

    this.dashboard.addEventListener('click', eventHandler);
    this.dashboard.addEventListener('hover', eventHandler);
    this.dashboard.addEventListener('filter', eventHandler);
    this.dashboard.addEventListener('zoom', eventHandler);
    this.dashboard.addEventListener('drilldown', eventHandler);
  }

  /**
   * 分发事件
   * @param event 事件对象
   */
  private dispatchEvent(event: IChartEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  /**
   * 检测用户首选主题
   */
  private detectPreferredTheme(): 'light' | 'dark' | 'auto' {
    if (window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }

    return 'light';
  }
}

// 导出组件
export { Dashboard } from './dashboard';
export { ChartAdapter } from './chart-adapter';
export { CanvasRenderer } from './renderers/canvas';
export { WebGLRenderer } from './renderers/webgl';

// 创建并导出默认实例
export const renderEngine = new RenderEngine();
