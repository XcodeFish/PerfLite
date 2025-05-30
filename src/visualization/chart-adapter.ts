/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import { IChartAdapter, IChartData, IChartOptions } from '../types/visualization';
import { CanvasRenderer } from './renderers/canvas';
import { WebGLRenderer } from './renderers/webgl';

type ChartLibrary = 'canvas' | 'webgl' | 'chartjs' | 'echarts';

/**
 * 图表适配器
 * 用于统一不同图表库的接口
 */
export class ChartAdapter implements IChartAdapter {
  private library: ChartLibrary;
  private renderer: WebGLRenderer | CanvasRenderer | null = null;
  private chartInstance: any = null;
  private container: HTMLElement | null = null;

  /**
   * 构造函数
   * @param library 图表库类型
   */
  constructor(library: ChartLibrary = 'canvas') {
    this.library = library;
  }

  /**
   * 创建图表
   * @param container 容器元素
   * @param options 图表选项
   */
  public createChart(container: HTMLElement, options: IChartOptions): unknown {
    this.container = container;

    // 根据库类型创建不同渲染器
    switch (this.library) {
      case 'webgl':
        return this.createWebGLChart(container, options);
      case 'canvas':
        return this.createCanvasChart(container, options);
      case 'chartjs':
        return this.createChartJsChart(container, options);
      case 'echarts':
        return this.createEChartsChart(container, options);
      default:
        return this.createCanvasChart(container, options);
    }
  }

  /**
   * 更新图表数据
   * @param chart 图表实例
   * @param data 图表数据
   */
  public updateChart(chart: unknown, data: IChartData): void {
    if (!chart) return;

    switch (this.library) {
      case 'webgl':
      case 'canvas':
        (chart as WebGLRenderer | CanvasRenderer).update(data);
        break;
      case 'chartjs':
        this.updateChartJsChart(chart as any, data);
        break;
      case 'echarts':
        this.updateEChartsChart(chart as any, data);
        break;
    }
  }

  /**
   * 销毁图表
   * @param chart 图表实例
   */
  public disposeChart(chart: unknown): void {
    if (!chart) return;

    switch (this.library) {
      case 'webgl':
      case 'canvas':
        (chart as WebGLRenderer | CanvasRenderer).destroy();
        break;
      case 'chartjs':
        (chart as any).destroy();
        break;
      case 'echarts':
        (chart as any).dispose();
        break;
    }

    this.chartInstance = null;
    this.renderer = null;
  }

  /**
   * 获取可用图表类型
   */
  public getAvailableChartTypes(): string[] {
    const commonTypes = ['line', 'bar', 'pie', 'scatter'];

    switch (this.library) {
      case 'webgl':
      case 'canvas':
        return [...commonTypes, 'heatmap'];
      case 'chartjs':
        return [...commonTypes, 'radar', 'polarArea', 'bubble'];
      case 'echarts':
        return [...commonTypes, 'sankey', 'heatmap', 'tree', 'treemap', 'gauge'];
      default:
        return commonTypes;
    }
  }

  /**
   * 导出图表为图像
   * @param chart 图表实例
   * @param type 导出格式
   */
  public exportChart(chart: unknown, type: 'png' | 'jpg' | 'svg'): string {
    if (!chart) return '';

    switch (this.library) {
      case 'webgl':
      case 'canvas':
        return (chart as WebGLRenderer | CanvasRenderer).toDataURL();
      case 'chartjs':
        return (chart as any).toBase64Image();
      case 'echarts':
        return (chart as any).getDataURL({ type: type === 'svg' ? 'svg' : 'png' });
      default:
        return '';
    }
  }

  /**
   * 设置主题
   * @param chart 图表实例
   * @param theme 主题名称
   */
  public setTheme(chart: unknown, theme: string): void {
    if (!chart) return;

    switch (this.library) {
      case 'webgl':
      case 'canvas':
        // 重新渲染即可，主题会在渲染时应用
        if (this.chartInstance && this.container) {
          this.createChart(this.container, {
            ...this.chartInstance.options,
            theme: theme as 'light' | 'dark' | 'auto',
          });
        }
        break;
      case 'echarts':
        (chart as any).setTheme(theme);
        break;
    }
  }

  /**
   * 创建WebGL图表
   * @param container 容器元素
   * @param options 图表选项
   */
  private createWebGLChart(container: HTMLElement, options: IChartOptions): WebGLRenderer {
    const renderer = new WebGLRenderer();
    renderer.init(container);
    this.renderer = renderer;
    this.chartInstance = { renderer, options };
    return renderer;
  }

  /**
   * 创建Canvas图表
   * @param container 容器元素
   * @param options 图表选项
   */
  private createCanvasChart(container: HTMLElement, options: IChartOptions): CanvasRenderer {
    const renderer = new CanvasRenderer();
    renderer.init(container);
    this.renderer = renderer;
    this.chartInstance = { renderer, options };
    return renderer;
  }

  /**
   * 创建Chart.js图表
   * @param container 容器元素
   * @param options 图表选项
   */
  private createChartJsChart(container: HTMLElement, options: IChartOptions): unknown {
    if (typeof window === 'undefined' || !(window as any).Chart) {
      console.error('Chart.js未加载，回退到Canvas渲染');
      return this.createCanvasChart(container, options);
    }

    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);

    const Chart = (window as any).Chart;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('无法获取Canvas上下文，回退到Canvas渲染');
      return this.createCanvasChart(container, options);
    }

    // 转换选项为Chart.js格式
    const chartJsOptions = this.convertToChartJsOptions(options);
    const chart = new Chart(ctx, chartJsOptions);

    this.chartInstance = { chart, options };
    return chart;
  }

  /**
   * 创建ECharts图表
   * @param container 容器元素
   * @param options 图表选项
   */
  private createEChartsChart(container: HTMLElement, options: IChartOptions): unknown {
    if (typeof window === 'undefined' || !(window as any).echarts) {
      console.error('ECharts未加载，回退到Canvas渲染');
      return this.createCanvasChart(container, options);
    }

    const echarts = (window as any).echarts;
    const chart = echarts.init(container, options.theme === 'dark' ? 'dark' : '');

    // 转换选项为ECharts格式
    const echartsOptions = this.convertToEChartsOptions(options);
    chart.setOption(echartsOptions);

    this.chartInstance = { chart, options };
    return chart;
  }

  /**
   * 更新Chart.js图表
   * @param chart Chart.js图表实例
   * @param data 图表数据
   */
  private updateChartJsChart(chart: any, data: IChartData): void {
    if (!chart || !chart.data || !data.metrics) return;

    // 更新数据
    chart.data.labels = data.metrics.map((m) => m.name || m.timestamp);
    chart.data.datasets[0].data = data.metrics.map((m) => m.value);

    // 重新绘制
    chart.update();
  }

  /**
   * 更新ECharts图表
   * @param chart ECharts图表实例
   * @param data 图表数据
   */
  private updateEChartsChart(chart: any, data: IChartData): void {
    if (!chart || !data.metrics) return;

    const options: any = {
      series: [
        {
          data: data.metrics.map((m) => ({
            name: m.name || m.timestamp,
            value: m.value,
          })),
        },
      ],
    };

    // 重新绘制
    chart.setOption(options);
  }

  /**
   * 将通用选项转换为Chart.js选项
   * @param options 通用图表选项
   */
  private convertToChartJsOptions(options: IChartOptions): any {
    const { type, title, subtitle, colors } = options;

    // 创建Chart.js配置
    return {
      type: this.mapChartType(type, 'chartjs'),
      data: {
        labels: [],
        datasets: [
          {
            label: title || '',
            backgroundColor: colors || [
              'rgba(84, 112, 198, 0.6)',
              'rgba(145, 204, 117, 0.6)',
              'rgba(250, 200, 88, 0.6)',
              'rgba(238, 102, 102, 0.6)',
            ],
            borderColor: colors ? colors[0] : 'rgba(84, 112, 198, 1)',
            data: [],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          title: {
            display: !!title,
            text: title || '',
            subtitle: {
              display: !!subtitle,
              text: subtitle || '',
            },
          },
          legend: {
            display: !!options.legend,
          },
          tooltip: {
            enabled: !!options.tooltip,
          },
        },
      },
    };
  }

  /**
   * 将通用选项转换为ECharts选项
   * @param options 通用图表选项
   */
  private convertToEChartsOptions(options: IChartOptions): any {
    const { type, title, subtitle, colors } = options;

    // 创建ECharts配置
    return {
      title: {
        text: title || '',
        subtext: subtitle || '',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        show: !!options.legend,
      },
      xAxis: {
        type: 'category',
        data: [],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: this.mapChartType(type, 'echarts'),
          data: [],
          color: colors,
        },
      ],
    };
  }

  /**
   * 映射图表类型
   * @param type 通用图表类型
   * @param library 目标图表库
   */
  private mapChartType(type: string, library: 'chartjs' | 'echarts'): string {
    if (library === 'chartjs') {
      switch (type) {
        case 'sankey':
        case 'heatmap':
          return 'line'; // Chart.js不支持这些类型，回退到折线图
        case 'gauge':
          return 'doughnut';
        default:
          return type;
      }
    } else if (library === 'echarts') {
      switch (type) {
        case 'line':
        case 'bar':
        case 'pie':
        case 'scatter':
        case 'heatmap':
        case 'sankey':
        case 'gauge':
          return type;
        case 'timeline':
          return 'line';
        case 'treemap':
          return 'treemap';
        default:
          return type;
      }
    }

    return type;
  }
}
