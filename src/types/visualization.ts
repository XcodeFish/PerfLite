import { IPerformanceMetric } from './perf';
import { IParsedError } from './error';

/**
 * 图表数据类型
 */
export interface IChartData {
  metrics?: IPerformanceMetric[];
  errors?: IParsedError[];
  correlations?: unknown[];
}

/**
 * 图表选项类型
 */
export interface IChartOptions {
  type: 'sankey' | 'heatmap' | 'line' | 'bar';
  theme: 'light' | 'dark' | 'auto';
  title?: string;
  subtitle?: string;
  dimensions?: { width: number; height: number };
  animate?: boolean;
}

/**
 * 渲染器接口
 */
export interface IRenderer {
  init(container: HTMLElement): void;
  render(data: IChartData, options: IChartOptions): void;
  update(data: IChartData): void;
  resize(dimensions: { width: number; height: number }): void;
  destroy(): void;
}

/**
 * 图表适配器接口
 */
export interface IChartAdapter {
  createChart(container: HTMLElement, options: IChartOptions): unknown;
  updateChart(chart: unknown, data: IChartData): void;
  disposeChart(chart: unknown): void;
}

/**
 * 仪表盘项配置
 */
export interface IDashboardItemConfig {
  id: string;
  title: string;
  type: 'sankey' | 'heatmap' | 'line' | 'bar';
  dataSource: string;
  dimensions: { width: number; height: number };
  position: { x: number; y: number };
}

/**
 * 仪表盘配置
 */
export interface IDashboardConfig {
  title: string;
  layout: 'grid' | 'free';
  items: IDashboardItemConfig[];
  theme: 'light' | 'dark' | 'auto';
  refreshInterval?: number;
}

/**
 * 可视化引擎接口
 */
export interface IVisualization {
  init(container: HTMLElement): void;
  renderDashboard(data: IChartData, config: IDashboardConfig): void;
  renderChart(data: IChartData, options: IChartOptions, container: HTMLElement): unknown;
  updateChart(chart: unknown, data: IChartData): void;
  setTheme(theme: 'light' | 'dark' | 'auto'): void;
  destroy(): void;
}
