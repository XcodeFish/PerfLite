/* eslint-disable indent */
import {
  IVisualization,
  IRenderer,
  IChartData,
  IDashboardConfig,
  IChartOptions,
  IChartEvent,
} from '../types/visualization';
import { Dashboard } from './dashboard';
import { ChartAdapter } from './chart-adapter';
import { CanvasRenderer } from './renderers/canvas';
import { WebGLRenderer } from './renderers/webgl';

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
