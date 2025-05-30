/* eslint-disable indent */
import { ICanvasRenderer, IChartData, IChartOptions } from '../../types/visualization';

/**
 * Canvas渲染器实现
 */
export class CanvasRenderer implements ICanvasRenderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private data: IChartData = {};
  private options: IChartOptions | null = null;
  private animationFrameId: number | null = null;
  private lastRenderTime = 0;
  private fps = 0;
  private frameCount = 0;
  private frameTime = 0;
  private lineWidth = 1;
  private compositeOperation: GlobalCompositeOperation = 'source-over';

  /**
   * 初始化Canvas渲染器
   * @param container 容器元素
   */
  public init(container: HTMLElement): void {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // 设置画布尺寸
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      this.resize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });

    resizeObserver.observe(container);
  }

  /**
   * 渲染图表
   * @param data 图表数据
   * @param options 图表选项
   */
  public render(data: IChartData, options: IChartOptions): void {
    if (!this.ctx || !this.canvas) return;

    this.data = data;
    this.options = options;

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 设置渲染样式
    this.applyTheme(options.theme);
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.globalCompositeOperation = this.compositeOperation;

    // 根据图表类型渲染
    switch (options.type) {
      case 'line':
        this.renderLineChart();
        break;
      case 'bar':
        this.renderBarChart();
        break;
      case 'pie':
        this.renderPieChart();
        break;
      case 'scatter':
        this.renderScatterChart();
        break;
      case 'heatmap':
        this.renderHeatmap();
        break;
      case 'timeline':
        this.renderTimeline();
        break;
      default:
        this.renderLineChart(); // 默认为折线图
    }

    // 渲染标题
    if (options.title) {
      this.renderTitle(options.title, options.subtitle);
    }

    // 渲染图例
    if (options.legend) {
      this.renderLegend();
    }

    // 计算性能指标
    this.calculatePerformance();
  }

  /**
   * 更新图表数据
   * @param data 新的图表数据
   */
  public update(data: IChartData): void {
    if (!this.options) return;
    this.render(data, this.options);
  }

  /**
   * 调整渲染器大小
   * @param dimensions 新的尺寸
   */
  public resize(dimensions: { width: number; height: number }): void {
    if (!this.canvas || !this.ctx) return;

    this.canvas.width = dimensions.width;
    this.canvas.height = dimensions.height;

    // 重新渲染
    if (this.data && this.options) {
      this.render(this.data, this.options);
    }
  }

  /**
   * 销毁渲染器
   */
  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }

    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.data = {};
    this.options = null;
  }

  /**
   * 获取图表的数据URL
   */
  public toDataURL(): string {
    return this.canvas?.toDataURL('image/png') || '';
  }

  /**
   * 获取渲染性能信息
   */
  public getPerformance(): { fps: number; renderTime: number; memoryUsage?: number } {
    return {
      fps: this.fps,
      renderTime: this.lastRenderTime,
      // 在支持的浏览器中获取内存使用情况
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
    };
  }

  /**
   * 启用或禁用动画
   * @param enable 是否启用动画
   */
  public enableAnimation(enable: boolean): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (enable && this.options) {
      const animate = () => {
        if (!this.options) return;
        this.render(this.data, this.options);
        this.animationFrameId = requestAnimationFrame(animate);
      };

      this.animationFrameId = requestAnimationFrame(animate);
    }
  }

  /**
   * 设置线宽
   * @param width 线宽
   */
  public setLineWidth(width: number): void {
    this.lineWidth = width;
    if (this.ctx) {
      this.ctx.lineWidth = width;
    }
  }

  /**
   * 设置合成操作
   * @param operation 合成操作
   */
  public setCompositeOperation(operation: string): void {
    this.compositeOperation = operation as GlobalCompositeOperation;
    if (this.ctx) {
      this.ctx.globalCompositeOperation = this.compositeOperation;
    }
  }

  /**
   * 获取DOM元素边界矩形
   */
  public getBoundingClientRect(): DOMRect {
    return this.canvas?.getBoundingClientRect() || new DOMRect();
  }

  /**
   * 获取Canvas渲染上下文
   */
  public getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  // 私有辅助方法

  /**
   * 应用主题样式
   * @param theme 主题名称
   */
  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (!this.ctx) return;

    // 根据主题设置颜色
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    this.ctx.fillStyle = isDark ? '#333' : '#fff';
    this.ctx.strokeStyle = isDark ? '#ddd' : '#333';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  /**
   * 渲染折线图
   */
  private renderLineChart(): void {
    if (!this.ctx || !this.canvas || !this.data.metrics) return;

    const { width, height } = this.canvas;
    const metrics = this.data.metrics;
    const padding = 40;

    const xScale = (width - padding * 2) / (metrics.length - 1 || 1);

    // 找出最大值和最小值
    const values = metrics.map((m) => m.value);
    const max = Math.max(...values) || 0;
    const min = Math.min(...values) || 0;
    const yScale = max - min > 0 ? (height - padding * 2) / (max - min) : 0;

    // 绘制坐标轴
    this.ctx.beginPath();
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(width - padding, height - padding); // X轴
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(padding, padding); // Y轴
    this.ctx.stroke();

    // 绘制数据线
    if (metrics.length > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(padding, height - padding - (metrics[0].value - min) * yScale);

      for (let i = 1; i < metrics.length; i++) {
        this.ctx.lineTo(padding + i * xScale, height - padding - (metrics[i].value - min) * yScale);
      }

      this.ctx.stroke();
    }

    // 绘制数据点
    for (let i = 0; i < metrics.length; i++) {
      const x = padding + i * xScale;
      const y = height - padding - (metrics[i].value - min) * yScale;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * 渲染柱状图
   */
  private renderBarChart(): void {
    if (!this.ctx || !this.canvas || !this.data.metrics) return;

    const { width, height } = this.canvas;
    const metrics = this.data.metrics;
    const padding = 40;

    // 计算柱宽和间距
    const barCount = metrics.length;
    const barWidth = Math.floor((width - padding * 2) / (barCount * 1.5));
    const barSpacing = Math.floor(barWidth / 2);

    // 找出最大值
    const max = Math.max(...metrics.map((m) => m.value)) || 0;
    const yScale = max > 0 ? (height - padding * 2) / max : 0;

    // 绘制坐标轴
    this.ctx.beginPath();
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(width - padding, height - padding); // X轴
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(padding, padding); // Y轴
    this.ctx.stroke();

    // 绘制柱状
    for (let i = 0; i < metrics.length; i++) {
      const x = padding + i * (barWidth + barSpacing);
      const barHeight = metrics[i].value * yScale;
      const y = height - padding - barHeight;

      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  /**
   * 渲染饼图
   */
  private renderPieChart(): void {
    if (!this.ctx || !this.canvas || !this.data.metrics) return;

    const { width, height } = this.canvas;
    const metrics = this.data.metrics;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2.5;

    // 计算总值
    const total = metrics.reduce((sum, m) => sum + m.value, 0);

    if (total === 0) return;

    // 定义颜色数组
    const colors = this.options?.colors || [
      '#5470c6',
      '#91cc75',
      '#fac858',
      '#ee6666',
      '#73c0de',
      '#3ba272',
      '#fc8452',
      '#9a60b4',
      '#ea7ccc',
    ];

    // 绘制饼图
    let startAngle = 0;
    for (let i = 0; i < metrics.length; i++) {
      const angle = (metrics[i].value / total) * Math.PI * 2;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
      this.ctx.closePath();

      this.ctx.fillStyle = colors[i % colors.length];
      this.ctx.fill();

      startAngle += angle;
    }
  }

  /**
   * 渲染散点图
   */
  private renderScatterChart(): void {
    if (!this.ctx || !this.canvas || !this.data.metrics) return;

    // 散点图实现...
  }

  /**
   * 渲染热力图
   */
  private renderHeatmap(): void {
    if (!this.ctx || !this.canvas || !this.data.metrics) return;

    // 热力图实现...
  }

  /**
   * 渲染时间线
   */
  private renderTimeline(): void {
    if (!this.ctx || !this.canvas || !this.data.metrics) return;

    // 时间线实现...
  }

  /**
   * 渲染标题
   */
  private renderTitle(title: string, subtitle?: string): void {
    if (!this.ctx || !this.canvas) return;

    const { width } = this.canvas;

    // 渲染主标题
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, 20);

    // 渲染副标题
    if (subtitle) {
      this.ctx.font = '12px Arial';
      this.ctx.fillText(subtitle, width / 2, 40);
    }
  }

  /**
   * 渲染图例
   */
  private renderLegend(): void {
    // 图例渲染实现...
  }

  /**
   * 计算性能指标
   */
  private calculatePerformance(): void {
    const now = performance.now();
    this.lastRenderTime = now - this.frameTime;
    this.frameTime = now;

    this.frameCount++;

    // 每秒更新一次FPS
    if (now - this.frameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
    }
  }
}
