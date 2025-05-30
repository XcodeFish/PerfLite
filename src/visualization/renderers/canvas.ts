/* eslint-disable indent */
import { ICanvasRenderer, IChartData, IChartOptions } from '../../types/visualization';

/**
 * Canvas渲染器实现
 */
export class CanvasRenderer implements ICanvasRenderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null; // 离屏Canvas
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null; // 离屏上下文
  private data: IChartData = {};
  private options: IChartOptions | null = null;
  private animationFrameId: number | null = null;
  private lastRenderTime = 0;
  private fps = 0;
  private frameCount = 0;
  private frameTime = 0;
  private lineWidth = 1;
  private compositeOperation: GlobalCompositeOperation = 'source-over';
  private pixelRatio = window.devicePixelRatio || 1;
  private useOffscreenRendering = true; // 是否使用离屏渲染
  // 脏区域列表 - 只更新变化的区域
  private dirtyRegions: Array<{ x: number; y: number; width: number; height: number }> = [];
  private isRendering: boolean = false;
  private needsRerender: boolean = false;

  /**
   * 初始化Canvas渲染器
   * @param container 容器元素
   */
  public init(container: HTMLElement): void {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // 设置画布尺寸并应用像素比
    this.canvas.width = container.clientWidth * this.pixelRatio;
    this.canvas.height = container.clientHeight * this.pixelRatio;

    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    // 初始化离屏Canvas
    if (this.useOffscreenRendering) {
      this.initOffscreenCanvas();
    }

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
   * 初始化离屏Canvas
   */
  private initOffscreenCanvas(): void {
    if (!this.canvas) return;

    // 尝试使用OffscreenCanvas API (更高性能)
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        // @ts-expect-error - OffscreenCanvas API可能不在所有环境下可用
        this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.offscreenCtx = this.offscreenCanvas!.getContext('2d', { alpha: true });
        console.log('使用OffscreenCanvas API');
        return;
      }
    } catch (error) {
      console.warn('OffscreenCanvas API不可用，回退到常规Canvas', error);
    }

    // 回退到常规Canvas
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
  }

  /**
   * 渲染图表
   * @param data 图表数据
   * @param options 图表选项
   */
  public render(data: IChartData, options: IChartOptions): void {
    const targetCtx = this.useOffscreenRendering ? this.offscreenCtx : this.ctx;
    const targetCanvas = this.useOffscreenRendering ? this.offscreenCanvas : this.canvas;

    if (!targetCtx || !targetCanvas || !this.ctx || !this.canvas) return;

    // 避免并发渲染
    if (this.isRendering) {
      this.needsRerender = true;
      return;
    }

    this.isRendering = true;
    const renderStartTime = performance.now();

    this.data = data;
    this.options = options;

    // 清空画布
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // 应用像素比缩放
    targetCtx.save();
    targetCtx.scale(this.pixelRatio, this.pixelRatio);

    // 设置渲染样式
    this.applyTheme(options.theme, targetCtx);
    targetCtx.lineWidth = this.lineWidth;
    targetCtx.globalCompositeOperation = this.compositeOperation;

    // 根据图表类型渲染
    switch (options.type) {
      case 'line':
        this.renderLineChart(targetCtx);
        break;
      case 'bar':
        this.renderBarChart(targetCtx);
        break;
      case 'pie':
        this.renderPieChart(targetCtx);
        break;
      case 'scatter':
        this.renderScatterChart(targetCtx);
        break;
      case 'heatmap':
        this.renderHeatmap(targetCtx);
        break;
      case 'timeline':
        this.renderTimeline(targetCtx);
        break;
      default:
        this.renderLineChart(targetCtx); // 默认为折线图
    }

    // 渲染标题
    if (options.title) {
      this.renderTitle(options.title, targetCtx, options.subtitle);
    }

    // 渲染图例
    if (options.legend) {
      this.renderLegend(targetCtx);
    }

    targetCtx.restore();

    // 如果使用离屏渲染，将离屏Canvas内容复制到主Canvas
    if (this.useOffscreenRendering && this.offscreenCanvas) {
      // 清空主画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 如果有脏区域，只复制脏区域
      if (this.dirtyRegions.length > 0) {
        for (const region of this.dirtyRegions) {
          this.ctx.drawImage(
            this.offscreenCanvas,
            region.x,
            region.y,
            region.width,
            region.height,
            region.x,
            region.y,
            region.width,
            region.height
          );
        }
        this.dirtyRegions = []; // 清空脏区域列表
      } else {
        // 否则复制整个画布
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      }
    }

    // 计算性能指标
    this.lastRenderTime = performance.now() - renderStartTime;
    this.calculatePerformance();

    this.isRendering = false;

    // 如果在渲染期间收到了新的渲染请求，重新渲染
    if (this.needsRerender && this.data && this.options) {
      this.needsRerender = false;
      requestAnimationFrame(() => this.render(this.data, this.options!));
    }
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
   * 部分更新 - 只重绘指定区域
   * @param data 新的图表数据
   * @param dirtyRegion 需要重绘的区域
   */
  public partialUpdate(
    data: IChartData,
    dirtyRegion: { x: number; y: number; width: number; height: number }
  ): void {
    if (!this.options) return;

    // 添加到脏区域列表
    this.dirtyRegions.push({
      x: dirtyRegion.x * this.pixelRatio,
      y: dirtyRegion.y * this.pixelRatio,
      width: dirtyRegion.width * this.pixelRatio,
      height: dirtyRegion.height * this.pixelRatio,
    });

    this.render(data, this.options);
  }

  /**
   * 调整渲染器大小
   * @param dimensions 新的尺寸
   */
  public resize(dimensions: { width: number; height: number }): void {
    if (!this.canvas || !this.ctx) return;

    // 设置画布尺寸并应用像素比
    this.canvas.width = dimensions.width * this.pixelRatio;
    this.canvas.height = dimensions.height * this.pixelRatio;

    // 调整离屏Canvas大小
    if (this.useOffscreenRendering && this.offscreenCanvas) {
      if (this.offscreenCanvas instanceof OffscreenCanvas) {
        // 如果是OffscreenCanvas API，需要创建新的实例
        // @ts-expect-error - OffscreenCanvas API可能不在所有环境下可用
        this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.offscreenCtx = this.offscreenCanvas!.getContext('2d', { alpha: true });
      } else {
        // 常规Canvas可以直接调整大小
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
      }
    }

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
    this.offscreenCanvas = null;
    this.ctx = null;
    this.offscreenCtx = null;
    this.container = null;
    this.data = {};
    this.options = null;
    this.dirtyRegions = [];
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
  }

  /**
   * 设置设备像素比
   * @param ratio 像素比
   */
  public setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.resize({
      width: this.container?.clientWidth || 0,
      height: this.container?.clientHeight || 0,
    });
  }

  /**
   * 启用或禁用离屏渲染
   * @param enable 是否启用
   */
  public enableOffscreenRendering(enable: boolean): void {
    this.useOffscreenRendering = enable;

    // 如果启用但离屏Canvas未初始化，则初始化
    if (enable && !this.offscreenCanvas && this.canvas) {
      this.initOffscreenCanvas();
    }
  }

  /**
   * 设置合成操作
   * @param operation 合成操作
   */
  public setCompositeOperation(operation: string): void {
    this.compositeOperation = operation as GlobalCompositeOperation;
  }

  /**
   * 获取边界矩形
   */
  public getBoundingClientRect(): DOMRect {
    return this.canvas?.getBoundingClientRect() || new DOMRect();
  }

  /**
   * 获取画布上下文
   */
  public getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * 应用主题样式
   * @param theme 主题
   * @param ctx 画布上下文
   */
  private applyTheme(theme: 'light' | 'dark' | 'auto', ctx: CanvasRenderingContext2D): void {
    const isDarkMode =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDarkMode) {
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#ddd';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
    } else {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    }

    ctx.font = '14px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
  }

  // 各种图表渲染方法

  /**
   * 渲染折线图
   * @param ctx Canvas上下文
   */
  private renderLineChart(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.metrics) return;

    const { width, height } = this.canvas;
    const metrics = this.data.metrics;
    const canvasWidth = width / this.pixelRatio;
    const canvasHeight = height / this.pixelRatio;

    const padding = 40;
    const chartWidth = canvasWidth - padding * 2;
    const chartHeight = canvasHeight - padding * 2;

    // 找出最大值和最小值
    const values = metrics.map((m) => m.value);
    const max = Math.max(...values) || 1;
    const min = Math.min(...values) || 0;

    // 计算比例尺
    const xScale = chartWidth / (metrics.length - 1 || 1);
    const yScale = max - min === 0 ? 0 : chartHeight / (max - min);

    // 绘制轴线
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvasHeight - padding);
    ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
    ctx.strokeStyle = '#999';
    ctx.stroke();

    // 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;

    metrics.forEach((metric, i) => {
      const x = padding + i * xScale;
      const y = canvasHeight - padding - (metric.value - min) * yScale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制数据点
    ctx.fillStyle = '#2196F3';
    metrics.forEach((metric, i) => {
      const x = padding + i * xScale;
      const y = canvasHeight - padding - (metric.value - min) * yScale;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * 渲染柱状图
   * @param ctx Canvas上下文
   */
  private renderBarChart(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.metrics) return;

    const { width, height } = this.canvas;
    const metrics = this.data.metrics;
    const canvasWidth = width / this.pixelRatio;
    const canvasHeight = height / this.pixelRatio;

    const padding = 40;
    const chartWidth = canvasWidth - padding * 2;
    const chartHeight = canvasHeight - padding * 2;

    // 找出最大值
    const max = Math.max(...metrics.map((m) => m.value)) || 1;

    // 计算柱子宽度和间距
    const barWidth = chartWidth / metrics.length - 10;
    const barSpacing = 10;

    // 绘制柱子
    ctx.fillStyle = '#4CAF50';

    metrics.forEach((metric, i) => {
      const barHeight = (metric.value / max) * chartHeight;
      const x = padding + i * (barWidth + barSpacing);
      const y = canvasHeight - padding - barHeight;

      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  /**
   * 渲染饼图
   * @param ctx Canvas上下文
   */
  private renderPieChart(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.metrics) return;

    const { width, height } = this.canvas;
    const metrics = this.data.metrics;
    const canvasWidth = width / this.pixelRatio;
    const canvasHeight = height / this.pixelRatio;

    // 计算饼图中心和半径
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(centerX, centerY) - 50;

    // 计算总和
    const total = metrics.reduce((sum, metric) => sum + metric.value, 0);

    // 颜色列表
    const colors = ['#F44336', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];

    // 绘制饼图
    let startAngle = 0;

    metrics.forEach((metric, i) => {
      const sliceAngle = (metric.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      startAngle = endAngle;
    });
  }

  /**
   * 渲染散点图
   * @param ctx Canvas上下文
   */
  private renderScatterChart(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.scatter) return;

    const { width, height } = this.canvas;
    const points = this.data.scatter.points || [];
    const canvasWidth = width / this.pixelRatio;
    const canvasHeight = height / this.pixelRatio;

    const padding = 40;
    const chartWidth = canvasWidth - padding * 2;
    const chartHeight = canvasHeight - padding * 2;

    // 找出x和y的最大值和最小值
    let xMax = -Infinity;
    let xMin = Infinity;
    let yMax = -Infinity;
    let yMin = Infinity;

    points.forEach((point: { x: number; y: number }) => {
      xMax = Math.max(xMax, point.x);
      xMin = Math.min(xMin, point.x);
      yMax = Math.max(yMax, point.y);
      yMin = Math.min(yMin, point.y);
    });

    // 确保有实际范围
    if (xMax === xMin) xMax = xMin + 1;
    if (yMax === yMin) yMax = yMin + 1;

    // 绘制散点
    ctx.fillStyle = '#E91E63';

    points.forEach((point: { x: number; y: number }) => {
      const x = padding + ((point.x - xMin) / (xMax - xMin)) * chartWidth;
      const y = canvasHeight - padding - ((point.y - yMin) / (yMax - yMin)) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * 渲染热图
   * @param ctx Canvas上下文
   */
  private renderHeatmap(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.heatmap) return;

    const { width, height } = this.canvas;
    const heatmap = this.data.heatmap;
    const canvasWidth = width / this.pixelRatio;
    const canvasHeight = height / this.pixelRatio;

    // 如果没有数据或尺寸信息，返回
    if (!heatmap.data || !heatmap.width || !heatmap.height) return;

    const { data, width: hmWidth, height: hmHeight } = heatmap;

    // 计算单元格大小
    const cellWidth = canvasWidth / hmWidth;
    const cellHeight = canvasHeight / hmHeight;

    // 找出最大值和最小值
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, data[i]);
      min = Math.min(min, data[i]);
    }

    // 确保有实际范围
    if (max === min) max = min + 1;

    // 绘制热图单元格
    for (let y = 0; y < hmHeight; y++) {
      for (let x = 0; x < hmWidth; x++) {
        const index = y * hmWidth + x;
        if (index >= data.length) continue;

        const value = data[index];
        const normalizedValue = (value - min) / (max - min); // 归一化到0-1

        // 计算颜色（使用热力图配色）
        const r = Math.floor(normalizedValue * 255);
        const g = Math.floor(Math.max(0, 1 - Math.abs(normalizedValue - 0.5) * 2) * 255);
        const b = Math.floor(Math.max(0, 1 - normalizedValue) * 255);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }
  }

  /**
   * 渲染时间线
   * @param ctx Canvas上下文
   */
  private renderTimeline(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.timeline) return;

    const { width, height } = this.canvas;
    const timeline = this.data.timeline;
    const canvasWidth = width / this.pixelRatio;
    const canvasHeight = height / this.pixelRatio;

    const padding = 40;
    const chartWidth = canvasWidth - padding * 2;

    // 如果没有数据，返回
    if (!timeline.events || timeline.events.length === 0) return;

    // 找出时间范围
    let minTime = Infinity;
    let maxTime = -Infinity;

    timeline.events.forEach((event: { startTime: number; endTime?: number }) => {
      minTime = Math.min(minTime, event.startTime);
      maxTime = Math.max(maxTime, event.endTime || event.startTime);
    });

    // 确保有实际范围
    if (maxTime === minTime) maxTime = minTime + 1000;

    // 绘制时间轴
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(padding, canvasHeight - padding);
    ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
    ctx.stroke();

    // 绘制事件
    const barHeight = 20;
    const rowSpacing = 5;

    timeline.events.forEach(
      (event: { startTime: number; endTime?: number; name: string; color?: string }, i: number) => {
        const startX = padding + ((event.startTime - minTime) / (maxTime - minTime)) * chartWidth;
        const endX =
          padding +
          (((event.endTime || event.startTime + 1) - minTime) / (maxTime - minTime)) * chartWidth;
        const y = padding + i * (barHeight + rowSpacing);

        // 绘制事件条
        ctx.fillStyle = event.color || '#2196F3';
        ctx.fillRect(startX, y, endX - startX, barHeight);

        // 绘制事件名称
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText(event.name, startX + 5, y + barHeight / 2 + 4);
      }
    );
  }

  /**
   * 渲染标题
   * @param title 标题
   * @param ctx 画布上下文
   * @param subtitle 副标题
   */
  private renderTitle(title: string, ctx: CanvasRenderingContext2D, subtitle?: string): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.pixelRatio;

    // 标题
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth / 2, 20);

    // 副标题
    if (subtitle) {
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(subtitle, canvasWidth / 2, 40);
    }
  }

  /**
   * 渲染图例
   * @param ctx 画布上下文
   */
  private renderLegend(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas || !this.data.datasets) return;

    const datasets = this.data.datasets;
    const canvasWidth = this.canvas.width / this.pixelRatio;

    // 颜色列表
    const colors = ['#F44336', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];

    // 设置图例位置
    const legendX = canvasWidth - 150;
    const legendY = 30;
    const itemHeight = 20;

    // 绘制图例项
    datasets.forEach((dataset: { label?: string; color?: string }, i: number) => {
      // 绘制颜色框
      ctx.fillStyle = dataset.color || colors[i % colors.length];
      ctx.fillRect(legendX, legendY + i * itemHeight, 15, 15);

      // 绘制标签
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(dataset.label || `数据集 ${i + 1}`, legendX + 20, legendY + i * itemHeight + 12);
    });
  }

  /**
   * 计算性能指标
   */
  private calculatePerformance(): void {
    const now = performance.now();
    this.frameCount++;

    if (now - this.frameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.frameTime = now;
    }
  }
}
