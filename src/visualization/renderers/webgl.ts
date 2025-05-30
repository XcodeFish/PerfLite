/* eslint-disable indent */
import { IWebGLRenderer, IChartData, IChartOptions } from '../../types/visualization';

// SIMD支持检测
const hasSIMD = () => {
  try {
    // @ts-expect-error SIMD API不在标准TypeScript类型中
    return typeof Float32x4 !== 'undefined' || typeof window.SIMD !== 'undefined';
  } catch {
    return false;
  }
};

/**
 * WebGL渲染器实现
 */
export class WebGLRenderer implements IWebGLRenderer {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private isWebGL2: boolean = false;
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
  private enableSIMD: boolean = false;

  // 渲染状态
  private isRendering: boolean = false;
  private needsRerender: boolean = false;

  // 着色器程序
  private shaderProgram: WebGLProgram | null = null;

  // 缓冲区
  private vertexBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  // 顶点数组对象 (WebGL2)
  private vao: WebGLVertexArrayObject | null = null;

  // WebGL2特有扩展
  private webgl2Extensions: Record<string, any> = {};

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

    // 检测SIMD支持
    this.enableSIMD = hasSIMD();
    console.log(`SIMD支持: ${this.enableSIMD ? '可用' : '不可用'}`);

    // 获取WebGL上下文 (尝试WebGL2)
    const contextOptions = {
      alpha: true,
      antialias: this.antialiasing,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
    };

    // 尝试获取WebGL2上下文
    this.gl = this.canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext;
    this.isWebGL2 = !!this.gl;

    // 如果WebGL2不可用，回退到WebGL1
    if (!this.gl) {
      this.gl =
        (this.canvas.getContext('webgl', contextOptions) as WebGLRenderingContext) ||
        (this.canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext);
      this.isWebGL2 = false;
    }

    if (!this.gl) {
      console.error('WebGL不可用，需要回退到Canvas渲染');
      return;
    }

    console.log(`WebGL版本: ${this.isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0'}`);

    // 加载WebGL2特有扩展
    if (this.isWebGL2) {
      this.loadWebGL2Extensions();
    }

    // 初始化着色器
    this.initShaders();

    // 创建顶点数组对象 (WebGL2)
    if (this.isWebGL2) {
      this.vao = (this.gl as WebGL2RenderingContext).createVertexArray();
    }

    // 设置清除颜色
    this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);

    // 启用深度测试和混合
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

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
   * 加载WebGL2特有扩展
   */
  private loadWebGL2Extensions(): void {
    if (!this.isWebGL2 || !this.gl) return;

    const gl2 = this.gl as WebGL2RenderingContext;

    // 常用的WebGL2扩展
    const extensions = [
      'EXT_color_buffer_float',
      'EXT_texture_filter_anisotropic',
      'OES_texture_float_linear',
    ];

    for (const ext of extensions) {
      try {
        const extension = gl2.getExtension(ext);
        if (extension) {
          this.webgl2Extensions[ext] = extension;
          console.log(`WebGL2扩展已加载: ${ext}`);
        }
      } catch (err) {
        console.warn(`无法加载WebGL2扩展: ${ext}`, err);
      }
    }
  }

  /**
   * 渲染图表
   * @param data 图表数据
   * @param options 图表选项
   */
  public render(data: IChartData, options: IChartOptions): void {
    if (!this.gl || !this.canvas) return;

    // 避免并发渲染
    if (this.isRendering) {
      this.needsRerender = true;
      return;
    }

    this.isRendering = true;
    const renderStartTime = performance.now();

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
      case 'sankey':
        this.renderSankeyDiagram();
        break;
      default:
        this.renderLineChart(); // 默认为折线图
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

    // 使用SIMD处理数据 (如果可用)
    if (this.enableSIMD) {
      data = this.processSIMD(data);
    }

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
   * 使用SIMD加速数据处理 (如果可用)
   */
  private processSIMD(data: IChartData): IChartData {
    // 如果SIMD不可用或数据为空，直接返回原数据
    if (!this.enableSIMD) {
      return data;
    }

    try {
      // 深拷贝数据以避免修改原数据
      const processedData = JSON.parse(JSON.stringify(data));

      // 处理数据集（如果存在）
      if (processedData.datasets && Array.isArray(processedData.datasets)) {
        processedData.datasets = processedData.datasets.map((dataset: any) => {
          if (Array.isArray(dataset.data)) {
            // 使用SIMD处理数值数组
            const len = dataset.data.length;
            if (len >= 4) {
              // SIMD处理需要至少4个元素
              // 创建视图以进行SIMD处理
              // @ts-expect-error SIMD API不在标准TypeScript类型中
              if (typeof Float32x4 !== 'undefined') {
                const buffer = new Float32Array(dataset.data);
                const result = new Float32Array(len);

                // 每次处理4个元素
                for (let i = 0; i <= len - 4; i += 4) {
                  // @ts-expect-error SIMD API不在标准TypeScript类型中
                  const simdData = new Float32x4(
                    buffer[i],
                    buffer[i + 1],
                    buffer[i + 2],
                    buffer[i + 3]
                  );

                  // 在这里执行SIMD操作，例如标准化或滤波
                  // 这里只是简单地返回原始值
                  Float32Array.from(simdData).forEach((v, j) => {
                    result[i + j] = v;
                  });
                }

                // 处理剩余元素
                for (let i = Math.floor(len / 4) * 4; i < len; i++) {
                  result[i] = buffer[i];
                }

                dataset.data = Array.from(result);
              }
            }
          }
          return dataset;
        });
      }

      // 处理指标数据（如果存在）
      if (processedData.metrics && Array.isArray(processedData.metrics)) {
        // 这里可以添加对metrics数组的SIMD处理
      }

      return processedData;
    } catch (error) {
      console.warn('SIMD数据处理失败', error);
      return data;
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

      // 清理WebGL2特有资源
      if (this.isWebGL2 && this.vao) {
        (this.gl as WebGL2RenderingContext).deleteVertexArray(this.vao);
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
    this.webgl2Extensions = {};
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
  public getContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
    return this.gl;
  }

  /**
   * 检查WebGL2是否可用
   */
  public isWebGL2Available(): boolean {
    return this.isWebGL2;
  }

  /**
   * 获取所有加载的WebGL2扩展
   */
  public getWebGL2Extensions(): string[] {
    return Object.keys(this.webgl2Extensions);
  }

  /**
   * 初始化着色器程序
   */
  private initShaders(): void {
    if (!this.gl) return;

    // 顶点着色器 - 支持WebGL2特性
    const vertexShaderSource = this.isWebGL2
      ? `#version 300 es
        in vec2 aPosition;
        in vec3 aColor;
        uniform vec2 uResolution;
        out vec3 vColor;
        
        void main() {
          // 将位置转换为归一化设备坐标
          vec2 position = aPosition / uResolution * 2.0 - 1.0;
          // Y轴翻转
          position.y *= -1.0;
          
          gl_Position = vec4(position, 0.0, 1.0);
          gl_PointSize = 5.0;
          vColor = aColor;
        }
      `
      : `
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

    // 片段着色器 - 支持WebGL2特性
    const fragmentShaderSource = this.isWebGL2
      ? `#version 300 es
        precision mediump float;
        in vec3 vColor;
        out vec4 fragColor;
        
        void main() {
          fragColor = vec4(vColor, 1.0);
        }
      `
      : `
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

    // 绑定VAO (WebGL2)
    if (this.isWebGL2 && this.vao) {
      (this.gl as WebGL2RenderingContext).bindVertexArray(this.vao);
    }

    // 创建顶点缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    // 绑定顶点位置属性
    const aPosition = this.gl.getAttribLocation(
      this.shaderProgram,
      this.isWebGL2 ? 'aPosition' : 'aPosition'
    );
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(aPosition);

    // 创建颜色缓冲区
    this.colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

    // 绑定颜色属性
    const aColor = this.gl.getAttribLocation(
      this.shaderProgram,
      this.isWebGL2 ? 'aColor' : 'aColor'
    );
    this.gl.vertexAttribPointer(aColor, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(aColor);

    // 绘制线条
    this.gl.drawArrays(this.gl.LINE_STRIP, 0, metrics.length);

    // 绘制点
    this.gl.drawArrays(this.gl.POINTS, 0, metrics.length);

    // 解除VAO绑定 (WebGL2)
    if (this.isWebGL2 && this.vao) {
      (this.gl as WebGL2RenderingContext).bindVertexArray(null);
    }
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
    if (!this.gl || !this.data.heatmap) return;

    const { data, width, height } = this.data.heatmap;
    if (!data || !width || !height) return;

    // 创建纹理
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // 设置纹理参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    // 创建纹理数据
    const textureData = new Uint8Array(width * height * 4);

    // 计算最大值和最小值
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;

    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, data[i]);
      min = Math.min(min, data[i]);
    }

    const range = max - min;

    // 填充纹理数据
    for (let i = 0; i < data.length; i++) {
      const value = (data[i] - min) / range; // 归一化
      const colorIndex = Math.floor(value * 4) * 3;

      // 使用预定义的热力图颜色映射
      const colors = this.getHeatmapColorMap();
      const r = colors[colorIndex];
      const g = colors[colorIndex + 1];
      const b = colors[colorIndex + 2];
      const a = 255;

      const index = i * 4;
      textureData[index] = r;
      textureData[index + 1] = g;
      textureData[index + 2] = b;
      textureData[index + 3] = a;
    }

    // 将纹理数据传输到GPU
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      textureData
    );

    // 创建顶点位置数据
    const positions = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];

    // 创建纹理坐标数据
    const texCoords = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];

    // 创建并绑定顶点位置缓冲区
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.shaderProgram!, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // 创建并绑定纹理坐标缓冲区
    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

    const texCoordLocation = this.gl.getAttribLocation(this.shaderProgram!, 'a_texCoord');
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // 绘制
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // 清理
    this.gl.deleteBuffer(positionBuffer);
    this.gl.deleteBuffer(texCoordBuffer);
    this.gl.deleteTexture(texture);
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
   * 渲染桑基图
   */
  private renderSankeyDiagram(): void {
    if (!this.gl || !this.data.sankey) return;

    const { nodes, links } = this.data.sankey;
    if (!nodes || !links) return;

    // 第1步：计算节点位置
    const nodeMap = new Map();
    const columns = this.calculateNodeColumns(nodes);
    const totalColumns = Math.max(...Object.values(columns)) + 1;
    const canvasWidth = this.canvas!.width;
    const canvasHeight = this.canvas!.height;
    const padding = 50 * this.pixelRatio;
    const columnWidth = (canvasWidth - padding * 2) / totalColumns;

    // 计算每列的节点数量，用于确定节点高度
    const columnCounts = Array(totalColumns).fill(0);
    nodes.forEach((node) => columnCounts[columns[node.id]]++);

    // 计算每列节点的位置
    const columnPointers = Array(totalColumns).fill(0);
    nodes.forEach((node) => {
      const col = columns[node.id];
      const x = padding + col * columnWidth + columnWidth / 2;
      const availHeight = canvasHeight - padding * 2;
      const nodeCount = columnCounts[col];
      const yStep = availHeight / nodeCount;
      const y = padding + columnPointers[col] * yStep + yStep / 2;

      columnPointers[col]++;

      nodeMap.set(node.id, {
        x,
        y,
        width: columnWidth * 0.8,
        height: Math.min(yStep * 0.8, 50 * this.pixelRatio),
        value: node.value || 1,
      });
    });

    // 第2步：渲染节点
    const nodeVertices: number[] = [];
    const nodeColors: number[] = [];

    nodes.forEach((node) => {
      const nodeInfo = nodeMap.get(node.id);
      if (!nodeInfo) return;

      const { x, y, width, height } = nodeInfo;
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      // 每个节点由两个三角形组成，共6个顶点
      const x1 = x - halfWidth;
      const x2 = x + halfWidth;
      const y1 = y - halfHeight;
      const y2 = y + halfHeight;

      // 转换为归一化设备坐标 (-1 到 1)
      const nx1 = (x1 / this.canvas!.width) * 2 - 1;
      const nx2 = (x2 / this.canvas!.width) * 2 - 1;
      const ny1 = -((y1 / this.canvas!.height) * 2 - 1); // WebGL Y轴向下
      const ny2 = -((y2 / this.canvas!.height) * 2 - 1);

      // 添加顶点
      nodeVertices.push(
        nx1,
        ny1,
        nx2,
        ny1,
        nx1,
        ny2, // 第一个三角形
        nx1,
        ny2,
        nx2,
        ny1,
        nx2,
        ny2 // 第二个三角形
      );

      // 节点颜色
      const color = this.getNodeColor(node.id, node.group);
      for (let i = 0; i < 6; i++) {
        nodeColors.push(...color); // 对每个顶点重复颜色
      }
    });

    // 创建并绑定节点顶点缓冲区
    const nodeVertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, nodeVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(nodeVertices), this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.shaderProgram!, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // 创建并绑定节点颜色缓冲区
    const nodeColorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, nodeColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(nodeColors), this.gl.STATIC_DRAW);

    const colorLocation = this.gl.getAttribLocation(this.shaderProgram!, 'a_color');
    this.gl.enableVertexAttribArray(colorLocation);
    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);

    // 绘制节点
    this.gl.drawArrays(this.gl.TRIANGLES, 0, nodeVertices.length / 2);

    // 第3步：渲染连接
    const linkVertices: number[] = [];
    const linkColors: number[] = [];

    links.forEach((link) => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) return;

      // 连接的宽度与值成比例
      const linkValue = link.value || Math.min(source.value, target.value) * 0.1;
      const sourceWidth = Math.min(source.height, linkValue * this.pixelRatio * 4);
      const targetWidth = Math.min(target.height, linkValue * this.pixelRatio * 4);

      // 计算连接的起点和终点
      const x1 = source.x + source.width / 2;
      const y1 = source.y;
      const x2 = target.x - target.width / 2;
      const y2 = target.y;

      // 贝塞尔曲线控制点
      const cpx = (x1 + x2) / 2;

      // 创建光滑曲线连接（使用多个线段近似贝塞尔曲线）
      const segments = 20;
      const points: Array<{ x: number; y: number }> = [];

      // 计算曲线点
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = this.bezierX(x1, cpx, x2, t);
        const y = this.bezierY(y1, y2, t);
        points.push({ x, y });
      }

      // 创建连接的边界线（上下两条）
      const topPoints: Array<{ x: number; y: number }> = [];
      const bottomPoints: Array<{ x: number; y: number }> = [];

      for (let i = 0; i <= segments; i++) {
        const width = sourceWidth + (targetWidth - sourceWidth) * (i / segments);
        const halfWidth = width / 2;
        topPoints.push({
          x: points[i].x,
          y: points[i].y - halfWidth,
        });
        bottomPoints.push({
          x: points[i].x,
          y: points[i].y + halfWidth,
        });
      }

      // 转换为三角形
      for (let i = 0; i < segments; i++) {
        const p1 = topPoints[i];
        const p2 = bottomPoints[i];
        const p3 = topPoints[i + 1];
        const p4 = bottomPoints[i + 1];

        // 转换为归一化设备坐标
        const nx1 = (p1.x / this.canvas!.width) * 2 - 1;
        const ny1 = -((p1.y / this.canvas!.height) * 2 - 1);
        const nx2 = (p2.x / this.canvas!.width) * 2 - 1;
        const ny2 = -((p2.y / this.canvas!.height) * 2 - 1);
        const nx3 = (p3.x / this.canvas!.width) * 2 - 1;
        const ny3 = -((p3.y / this.canvas!.height) * 2 - 1);
        const nx4 = (p4.x / this.canvas!.width) * 2 - 1;
        const ny4 = -((p4.y / this.canvas!.height) * 2 - 1);

        linkVertices.push(
          nx1,
          ny1,
          nx2,
          ny2,
          nx3,
          ny3, // 第一个三角形
          nx3,
          ny3,
          nx2,
          ny2,
          nx4,
          ny4 // 第二个三角形
        );

        // 连接颜色
        const color = this.getLinkColor(link.source, link.target, link.color);
        for (let j = 0; j < 6; j++) {
          linkColors.push(...color); // 对每个顶点重复颜色
        }
      }
    });

    // 创建并绑定连接顶点缓冲区
    const linkVertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, linkVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(linkVertices), this.gl.STATIC_DRAW);

    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // 创建并绑定连接颜色缓冲区
    const linkColorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, linkColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(linkColors), this.gl.STATIC_DRAW);

    this.gl.enableVertexAttribArray(colorLocation);
    this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);

    // 启用混合
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // 绘制连接
    this.gl.drawArrays(this.gl.TRIANGLES, 0, linkVertices.length / 2);

    // 禁用混合
    this.gl.disable(this.gl.BLEND);

    // 清理
    this.gl.deleteBuffer(nodeVertexBuffer);
    this.gl.deleteBuffer(nodeColorBuffer);
    this.gl.deleteBuffer(linkVertexBuffer);
    this.gl.deleteBuffer(linkColorBuffer);
  }

  /**
   * 计算节点列位置
   */
  private calculateNodeColumns(
    nodes: Array<{
      id: string;
      name?: string;
      value?: number;
      group?: string;
      targets?: string[];
    }>
  ): Record<string, number> {
    const columns: Record<string, number> = {};
    const visited = new Set<string>();
    const nodeMap = new Map<
      string,
      {
        id: string;
        name?: string;
        value?: number;
        group?: string;
        targets?: string[];
      }
    >();

    // 创建节点映射
    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    // 找出所有源节点（没有入边的节点）
    const sources = nodes.filter(
      (node) => !nodes.some((n) => n.targets && n.targets.includes(node.id))
    );

    // 使用BFS确定节点列位置
    const queue = sources.map((node) => ({ id: node.id, col: 0 }));

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) {
        columns[current.id] = Math.max(columns[current.id], current.col);
        continue;
      }

      visited.add(current.id);
      columns[current.id] = current.col;

      const node = nodeMap.get(current.id);
      if (node && node.targets) {
        for (const targetId of node.targets) {
          queue.push({ id: targetId, col: current.col + 1 });
        }
      }
    }

    return columns;
  }

  /**
   * 计算贝塞尔曲线X坐标
   */
  private bezierX(x1: number, cpx: number, x2: number, t: number): number {
    const t1 = 1 - t;
    return t1 * t1 * x1 + 2 * t1 * t * cpx + t * t * x2;
  }

  /**
   * 计算贝塞尔曲线Y坐标
   */
  private bezierY(y1: number, y2: number, t: number): number {
    return y1 + (y2 - y1) * t;
  }

  /**
   * 获取节点颜色
   */
  private getNodeColor(id: string, group?: string): [number, number, number, number] {
    // 颜色映射表
    const colorMap: Record<string, [number, number, number, number]> = {
      default: [0.2, 0.6, 0.9, 0.9],
      error: [0.9, 0.3, 0.3, 0.9],
      warning: [0.9, 0.7, 0.3, 0.9],
      success: [0.3, 0.8, 0.4, 0.9],
    };

    if (group && colorMap[group]) {
      return colorMap[group];
    }

    // 如果没有组或组不在映射表中，则根据ID生成一个稳定的颜色
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }

    const r = Math.abs(hash & 0xff) / 255;
    const g = Math.abs((hash >> 8) & 0xff) / 255;
    const b = Math.abs((hash >> 16) & 0xff) / 255;

    return [r, g, b, 0.9];
  }

  /**
   * 获取连接颜色
   */
  private getLinkColor(
    source: string,
    target: string,
    color?: string
  ): [number, number, number, number] {
    if (color) {
      const hexColor = color.startsWith('#') ? color : `#${color}`;
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);

      if (result) {
        return [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255,
          0.7, // 链接半透明
        ];
      }
    }

    // 如果没有指定颜色，使用源节点和目标节点的混合颜色
    const sourceColor = this.getNodeColor(source);
    const targetColor = this.getNodeColor(target);

    return [
      (sourceColor[0] + targetColor[0]) / 2,
      (sourceColor[1] + targetColor[1]) / 2,
      (sourceColor[2] + targetColor[2]) / 2,
      0.7, // 链接半透明
    ];
  }

  /**
   * 获取热力图颜色映射
   */
  private getHeatmapColorMap(): number[] {
    // 从冷到热的颜色映射
    return [
      0,
      0,
      255, // 蓝色
      0,
      255,
      255, // 青色
      0,
      255,
      0, // 绿色
      255,
      255,
      0, // 黄色
      255,
      0,
      0, // 红色
    ];
  }

  /**
   * 计算性能指标
   */
  private calculatePerformance(): void {
    const now = performance.now();
    this.frameCount++;

    // 每秒更新一次FPS
    if (now - this.frameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.frameTime = now;
    }
  }
}
