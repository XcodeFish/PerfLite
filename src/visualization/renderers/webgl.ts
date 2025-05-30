/* eslint-disable indent */
import { IWebGLRenderer, IChartData, IChartOptions } from '../../types/visualization';

/**
 * WebGL渲染器实现
 */
export class WebGLRenderer implements IWebGLRenderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private data: IChartData = {};
  private options: IChartOptions | null = null;
  private animationFrameId: number | null = null;
  private lastRenderTime = 0;
  private fps = 0;
  private frameCount = 0;
  private frameTime = 0;
  private pixelRatio = window.devicePixelRatio || 1;
  private clearColor = { r: 0, g: 0, b: 0, a: 0 };
  private antialiasing = true;

  // 着色器程序
  private shaderProgram: WebGLProgram | null = null;

  // 缓冲区
  private vertexBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  /**
   * 初始化WebGL渲染器
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

    // 获取WebGL上下文
    const contextOptions = {
      alpha: true,
      antialias: this.antialiasing,
      preserveDrawingBuffer: true,
    };

    this.gl =
      (this.canvas.getContext('webgl', contextOptions) as WebGLRenderingContext) ||
      (this.canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext);

    if (!this.gl) {
      console.error('WebGL不可用，回退到Canvas渲染');
      return;
    }

    // 初始化着色器
    this.initShaders();

    // 设置清除颜色
    this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);

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
    if (!this.gl || !this.canvas) return;

    this.data = data;
    this.options = options;

    // 清除画布
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // 根据图表类型渲染
    switch (options.type) {
      case 'line':
        this.renderLineChart();
        break;
      case 'bar':
        this.renderBarChart();
        break;
      case 'scatter':
        this.renderScatterChart();
        break;
      case 'heatmap':
        this.renderHeatmap();
        break;
      default:
        this.renderLineChart(); // 默认为折线图
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
    if (!this.canvas || !this.gl) return;

    // 设置画布尺寸并应用像素比
    this.canvas.width = dimensions.width * this.pixelRatio;
    this.canvas.height = dimensions.height * this.pixelRatio;

    // 设置视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

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

    if (this.gl) {
      // 清理WebGL资源
      if (this.vertexBuffer) {
        this.gl.deleteBuffer(this.vertexBuffer);
      }

      if (this.colorBuffer) {
        this.gl.deleteBuffer(this.colorBuffer);
      }

      if (this.shaderProgram) {
        this.gl.deleteProgram(this.shaderProgram);
      }
    }

    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }

    this.canvas = null;
    this.gl = null;
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
   * 设置设备像素比
   * @param ratio 像素比
   */
  public setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.resize({
      width: this.container?.clientWidth || 300,
      height: this.container?.clientHeight || 200,
    });
  }

  /**
   * 设置清除颜色
   * @param color 颜色
   */
  public setClearColor(color: string): void {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(color);
    this.clearColor = { ...rgb, a: 1.0 };

    if (this.gl) {
      this.gl.clearColor(
        this.clearColor.r,
        this.clearColor.g,
        this.clearColor.b,
        this.clearColor.a
      );
    }
  }

  /**
   * 设置抗锯齿
   * @param enable 是否启用
   */
  public setAntialiasing(enable: boolean): void {
    this.antialiasing = enable;
    // 需要重新创建上下文才能应用抗锯齿设置
    if (this.canvas && this.container) {
      this.destroy();
      this.init(this.container);
    }
  }

  /**
   * 获取DOM元素边界矩形
   */
  public getBoundingClientRect(): DOMRect {
    return this.canvas?.getBoundingClientRect() || new DOMRect();
  }

  /**
   * 获取WebGL渲染上下文
   */
  public getContext(): WebGLRenderingContext | null {
    return this.gl;
  }

  /**
   * 初始化着色器程序
   */
  private initShaders(): void {
    if (!this.gl) return;

    // 顶点着色器
    const vertexShaderSource = `
      attribute vec2 aPosition;
      attribute vec3 aColor;
      uniform vec2 uResolution;
      varying vec3 vColor;
      
      void main() {
        // 将位置转换为归一化设备坐标
        vec2 position = aPosition / uResolution * 2.0 - 1.0;
        // Y轴翻转
        position.y *= -1.0;
        
        gl_Position = vec4(position, 0.0, 1.0);
        gl_PointSize = 5.0;
        vColor = aColor;
      }
    `;

    // 片段着色器
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

    // 创建着色器程序
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    this.shaderProgram = this.gl.createProgram();
    if (!this.shaderProgram) return;

    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error('无法初始化着色器程序: ' + this.gl.getProgramInfoLog(this.shaderProgram));
      return;
    }

    this.gl.useProgram(this.shaderProgram);
  }

  /**
   * 创建着色器
   * @param type 着色器类型
   * @param source 着色器源代码
   */
  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('着色器编译错误: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * 渲染折线图
   */
  private renderLineChart(): void {
    if (!this.gl || !this.canvas || !this.data.metrics || !this.shaderProgram) return;

    const metrics = this.data.metrics;
    if (metrics.length < 2) return;

    const { width, height } = this.canvas;

    // 设置分辨率
    const uResolutionLocation = this.gl.getUniformLocation(this.shaderProgram, 'uResolution');
    this.gl.uniform2f(uResolutionLocation, width, height);

    // 计算点位置
    const padding = 40 * this.pixelRatio;
    const xScale = (width - padding * 2) / (metrics.length - 1);

    // 找出最大值和最小值
    const values = metrics.map((m) => m.value);
    const max = Math.max(...values) || 1;
    const min = Math.min(...values) || 0;
    const yScale = max - min > 0 ? (height - padding * 2) / (max - min) : 0;

    // 准备顶点数据
    const vertices: number[] = [];
    const colors: number[] = [];

    // 定义线条颜色
    const lineColors = this.getColorsByTheme(this.options?.theme || 'light');

    for (let i = 0; i < metrics.length; i++) {
      const x = padding + i * xScale;
      const y = height - padding - (metrics[i].value - min) * yScale;

      vertices.push(x, y);
      colors.push(...lineColors);
    }

    // 创建顶点缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    // 绑定顶点位置属性
    const aPosition = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(aPosition);

    // 创建颜色缓冲区
    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

    // 绑定颜色属性
    const aColor = this.gl.getAttribLocation(this.shaderProgram, 'aColor');
    this.gl.vertexAttribPointer(aColor, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(aColor);

    // 绘制线条
    this.gl.drawArrays(this.gl.LINE_STRIP, 0, metrics.length);

    // 绘制点
    this.gl.drawArrays(this.gl.POINTS, 0, metrics.length);
  }

  /**
   * 渲染柱状图
   */
  private renderBarChart(): void {
    if (!this.gl || !this.canvas || !this.data.metrics || !this.shaderProgram) return;

    // 柱状图实现...
  }

  /**
   * 渲染散点图
   */
  private renderScatterChart(): void {
    if (!this.gl || !this.canvas || !this.data.metrics || !this.shaderProgram) return;

    // 散点图实现...
  }

  /**
   * 渲染热力图
   */
  private renderHeatmap(): void {
    if (!this.gl || !this.canvas || !this.data.metrics || !this.shaderProgram) return;

    // 热力图实现...
  }

  /**
   * 根据主题获取颜色
   */
  private getColorsByTheme(theme: 'light' | 'dark' | 'auto'): number[] {
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // RGB颜色值 (0-1范围)
    return isDark ? [0.8, 0.8, 0.8] : [0.2, 0.6, 0.9];
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
