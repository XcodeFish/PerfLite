import { IPerformanceMetric } from './perf';
import { IParsedError } from './error';

/**
 * 图表数据类型
 */
export interface IChartData {
  metrics?: IPerformanceMetric[];
  errors?: IParsedError[];
  correlations?: unknown[];
  custom?: Record<string, unknown>;
  timestamp?: number;
  timeRange?: {
    start: number;
    end: number;
  };

  // 热力图数据结构
  heatmap?: {
    data: number[]; // 热力图值数组
    width: number; // 热力图宽度
    height: number; // 热力图高度
    xLabels?: string[]; // X轴标签
    yLabels?: string[]; // Y轴标签
  };

  // 散点图数据结构
  scatter?: {
    points: Array<{
      x: number;
      y: number;
      size?: number;
      color?: string;
      label?: string;
    }>;
    xAxis?: {
      min?: number;
      max?: number;
      label?: string;
    };
    yAxis?: {
      min?: number;
      max?: number;
      label?: string;
    };
  };

  // 时间线数据结构
  timeline?: {
    events: Array<{
      name: string;
      startTime: number;
      endTime?: number;
      color?: string;
      type?: string;
      details?: Record<string, unknown>;
    }>;
    timeRange?: {
      start: number;
      end: number;
    };
  };

  // 数据集集合
  datasets?: Array<{
    label?: string;
    data: any[];
    color?: string;
    type?: string;
    hidden?: boolean;
  }>;

  // 桑基图数据结构
  sankey?: {
    nodes: {
      id: string;
      name?: string;
      value?: number;
      group?: string;
      targets?: string[];
    }[];
    links: {
      source: string;
      target: string;
      value?: number;
      color?: string;
    }[];
  };
}

/**
 * 图表选项类型
 */
export interface IChartOptions {
  type:
    | 'sankey'
    | 'heatmap'
    | 'line'
    | 'bar'
    | 'pie'
    | 'timeline'
    | 'scatter'
    | 'gauge'
    | 'treemap';
  theme: 'light' | 'dark' | 'auto';
  title?: string;
  subtitle?: string;
  dimensions?: { width: number; height: number };
  animate?: boolean;
  legend?: boolean;
  tooltip?: boolean;
  zoom?: boolean;
  colors?: string[];
  axisLabels?: {
    x?: string;
    y?: string;
  };
  thresholds?: {
    good: number;
    warning: number;
    critical: number;
  };
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
  toDataURL(): string;
  getPerformance(): {
    fps: number;
    renderTime: number;
    memoryUsage?: number;
  };
  enableAnimation(enable: boolean): void;
}

/**
 * WebGL渲染器特有接口
 */
export interface IWebGLRenderer extends IRenderer {
  setPixelRatio(ratio: number): void;
  setClearColor(color: string): void;
  setAntialiasing(enable: boolean): void;
  getBoundingClientRect(): DOMRect;
  getContext(): WebGLRenderingContext | null;
}

/**
 * Canvas渲染器特有接口
 */
export interface ICanvasRenderer extends IRenderer {
  setLineWidth(width: number): void;
  setCompositeOperation(operation: string): void;
  getBoundingClientRect(): DOMRect;
  getContext(): CanvasRenderingContext2D | null;
}

/**
 * 图表适配器接口
 */
export interface IChartAdapter {
  createChart(container: HTMLElement, options: IChartOptions): unknown;
  updateChart(chart: unknown, data: IChartData): void;
  disposeChart(chart: unknown): void;
  getAvailableChartTypes(): string[];
  exportChart(chart: unknown, type: 'png' | 'jpg' | 'svg'): string;
  setTheme(chart: unknown, theme: string): void;
}

/**
 * 仪表盘项配置
 */
export interface IDashboardItemConfig {
  id: string;
  title: string;
  type:
    | 'sankey'
    | 'heatmap'
    | 'line'
    | 'bar'
    | 'pie'
    | 'timeline'
    | 'scatter'
    | 'gauge'
    | 'treemap';
  dataSource: string;
  dimensions: { width: number; height: number };
  position: { x: number; y: number };
  refreshInterval?: number;
  drilldown?: boolean;
  filter?: string;
  thresholds?: {
    good: number;
    warning: number;
    critical: number;
  };
  actions?: {
    id: string;
    label: string;
    callback: string;
  }[];
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
  autoAdjust?: boolean;
  defaultTimeRange?: {
    start: number;
    end: number;
  };
  filters?: {
    id: string;
    label: string;
    type: 'dropdown' | 'search' | 'date' | 'range';
    options?: string[];
    default?: string;
  }[];
  exportOptions?: {
    formats: ('png' | 'jpg' | 'svg' | 'pdf' | 'json')[];
  };
}

/**
 * 数据转换器接口
 */
export interface IDataTransformer {
  transform(data: unknown, options?: Record<string, unknown>): IChartData;
  getSchema(): Record<string, string>;
  validate(data: unknown): boolean;
}

/**
 * 交互事件类型
 */
export interface IChartEvent {
  type: 'click' | 'hover' | 'zoom' | 'filter' | 'drilldown';
  target?: {
    type: string;
    id: string;
    value?: unknown;
  };
  position?: {
    x: number;
    y: number;
  };
  data?: unknown;
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
  exportDashboard(format: 'png' | 'jpg' | 'svg' | 'pdf' | 'json'): Promise<string>;
  registerCustomChart(type: string, renderer: IRenderer): void;
  addEventListener(type: string, callback: (event: IChartEvent) => void): void;
  removeEventListener(type: string, callback: (event: IChartEvent) => void): void;
  getDashboardData(): IChartData;
  getDashboardConfig(): IDashboardConfig;
  setTimeRange(start: number, end: number): void;
  applyFilter(filter: Record<string, unknown>): void;
  createDataTransformer(options: Record<string, unknown>): IDataTransformer;
  getPerformanceStats(): {
    fps: number;
    renderTime: number;
    memoryUsage?: number;
    elements: number;
  };
}
