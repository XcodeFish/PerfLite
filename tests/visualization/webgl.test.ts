/**
 * WebGL渲染器单元测试
 */
import { WebGLRenderer } from '../../src/visualization/renderers/webgl';
import { IChartData, IChartOptions } from '../../src/types/visualization';

// 模拟Canvas和WebGL上下文
const mockWebGLRenderingContext = {
  VERTEX_SHADER: 'VERTEX_SHADER',
  FRAGMENT_SHADER: 'FRAGMENT_SHADER',
  COMPILE_STATUS: 'COMPILE_STATUS',
  LINK_STATUS: 'LINK_STATUS',
  COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
  DEPTH_BUFFER_BIT: 'DEPTH_BUFFER_BIT',
  ARRAY_BUFFER: 'ARRAY_BUFFER',
  STATIC_DRAW: 'STATIC_DRAW',
  FLOAT: 'FLOAT',
  TRIANGLES: 'TRIANGLES',
  LINE_STRIP: 'LINE_STRIP',
  POINTS: 'POINTS',
  TRIANGLE_STRIP: 'TRIANGLE_STRIP',
  DEPTH_TEST: 'DEPTH_TEST',
  BLEND: 'BLEND',
  SRC_ALPHA: 'SRC_ALPHA',
  ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',
  createShader: jest.fn().mockReturnValue({}),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn().mockReturnValue(true),
  createProgram: jest.fn().mockReturnValue({}),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn().mockReturnValue(true),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn().mockReturnValue(0),
  getUniformLocation: jest.fn().mockReturnValue({}),
  uniform2f: jest.fn(),
  vertexAttribPointer: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  createBuffer: jest.fn().mockReturnValue({}),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  viewport: jest.fn(),
  clearColor: jest.fn(),
  clear: jest.fn(),
  drawArrays: jest.fn(),
  deleteBuffer: jest.fn(),
  deleteProgram: jest.fn(),
  getShaderInfoLog: jest.fn().mockReturnValue(''),
  getProgramInfoLog: jest.fn().mockReturnValue(''),
  enable: jest.fn(),
  blendFunc: jest.fn(),
  disable: jest.fn(),
  getExtension: jest.fn().mockReturnValue(null),
};

// 创建一个模拟的WebGL2上下文
const mockWebGL2RenderingContext = {
  ...mockWebGLRenderingContext,
  createVertexArray: jest.fn().mockReturnValue({}),
  bindVertexArray: jest.fn(),
  deleteVertexArray: jest.fn(),
};

// 创建一个基本的测试数据
const mockChartData: IChartData = {
  metrics: [
    { name: 'Metric 1', value: 10, unit: 'ms', timestamp: 1000 },
    { name: 'Metric 2', value: 20, unit: 'ms', timestamp: 2000 },
    { name: 'Metric 3', value: 15, unit: 'ms', timestamp: 3000 },
  ],
};

// 基本图表选项
const mockChartOptions: IChartOptions = {
  type: 'line',
  title: 'Test Chart',
  theme: 'light',
};

describe('WebGL渲染器', () => {
  let renderer: WebGLRenderer;
  let mockContainer: HTMLElement;
  let mockCanvas: HTMLCanvasElement;
  let mockObserve: jest.Mock;

  beforeEach(() => {
    // 设置Canvas模拟
    mockCanvas = {
      getContext: jest.fn().mockImplementation((type) => {
        if (type === 'webgl2') {
          return mockWebGL2RenderingContext;
        }
        return mockWebGLRenderingContext;
      }),
      width: 800,
      height: 600,
      style: {},
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,'),
      getBoundingClientRect: jest.fn().mockReturnValue({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
      }),
    } as unknown as HTMLCanvasElement;

    // 设置容器模拟
    mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    } as unknown as HTMLElement;

    // 模拟DOM
    document.createElement = jest.fn().mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return {} as any;
    });

    // 模拟ResizeObserver
    mockObserve = jest.fn();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: mockObserve,
      disconnect: jest.fn(),
    }));

    // 创建渲染器实例
    renderer = new WebGLRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 测试初始化
   */
  test('初始化渲染器', () => {
    renderer.init(mockContainer);

    // 应该创建canvas并添加到容器
    expect(document.createElement).toHaveBeenCalledWith('canvas');
    expect(mockContainer.appendChild).toHaveBeenCalledWith(mockCanvas);

    // 应该尝试获取WebGL上下文
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl2', expect.any(Object));

    // 应该设置ResizeObserver
    expect(mockObserve).toHaveBeenCalledWith(mockContainer);
  });

  /**
   * 测试WebGL2检测
   */
  test('检测WebGL2', () => {
    // 模拟WebGL2可用
    mockCanvas.getContext = jest.fn().mockImplementation((type) => {
      if (type === 'webgl2') {
        return mockWebGL2RenderingContext;
      }
      return null;
    });

    renderer.init(mockContainer);
    expect(renderer.isWebGL2Available()).toBe(true);

    // 模拟WebGL2不可用
    mockCanvas.getContext = jest.fn().mockImplementation((type) => {
      if (type === 'webgl2') {
        return null;
      }
      return mockWebGLRenderingContext;
    });

    renderer = new WebGLRenderer();
    renderer.init(mockContainer);
    expect(renderer.isWebGL2Available()).toBe(false);
  });

  /**
   * 测试渲染
   */
  test('渲染图表', () => {
    renderer.init(mockContainer);
    renderer.render(mockChartData, mockChartOptions);

    // 应该清除画布
    expect(mockWebGL2RenderingContext.clear).toHaveBeenCalled();

    // 应该尝试绘制
    expect(mockWebGL2RenderingContext.drawArrays).toHaveBeenCalled();
  });

  /**
   * 测试更新
   */
  test('更新图表数据', () => {
    renderer.init(mockContainer);
    renderer.render(mockChartData, mockChartOptions);

    // 清除之前的调用记录
    jest.clearAllMocks();

    // 更新数据
    renderer.update(mockChartData);

    // 应该再次渲染
    expect(mockWebGL2RenderingContext.clear).toHaveBeenCalled();
    expect(mockWebGL2RenderingContext.drawArrays).toHaveBeenCalled();
  });

  /**
   * 测试调整大小
   */
  test('调整渲染器大小', () => {
    renderer.init(mockContainer);

    // 清除之前的调用记录
    jest.clearAllMocks();

    // 调整大小
    renderer.resize({ width: 1000, height: 800 });

    // 应该设置画布大小和视口
    expect(mockCanvas.width).toBe(1000 * window.devicePixelRatio);
    expect(mockCanvas.height).toBe(800 * window.devicePixelRatio);
    expect(mockWebGL2RenderingContext.viewport).toHaveBeenCalled();
  });

  /**
   * 测试销毁
   */
  test('销毁渲染器', () => {
    renderer.init(mockContainer);
    renderer.render(mockChartData, mockChartOptions);

    // 清除之前的调用记录
    jest.clearAllMocks();

    // 销毁
    renderer.destroy();

    // 应该从容器中移除画布
    expect(mockContainer.removeChild).toHaveBeenCalledWith(mockCanvas);
  });

  /**
   * 测试获取数据URL
   */
  test('获取图表数据URL', () => {
    renderer.init(mockContainer);

    const url = renderer.toDataURL();
    expect(url).toBe('data:image/png;base64,');
    expect(mockCanvas.toDataURL).toHaveBeenCalled();
  });

  /**
   * 测试性能指标
   */
  test('获取性能信息', () => {
    renderer.init(mockContainer);

    const performance = renderer.getPerformance();
    expect(performance).toHaveProperty('fps');
    expect(performance).toHaveProperty('renderTime');
  });

  /**
   * 测试启用/禁用动画
   */
  test('启用和禁用动画', () => {
    // 模拟requestAnimationFrame和cancelAnimationFrame
    const mockRequestId = 123;
    global.requestAnimationFrame = jest.fn().mockReturnValue(mockRequestId);
    global.cancelAnimationFrame = jest.fn();

    renderer.init(mockContainer);
    renderer.render(mockChartData, mockChartOptions);

    // 启用动画
    renderer.enableAnimation(true);
    expect(global.requestAnimationFrame).toHaveBeenCalled();

    // 禁用动画
    renderer.enableAnimation(false);
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(mockRequestId);
  });

  /**
   * 测试WebGL2扩展加载
   */
  test('加载WebGL2扩展', () => {
    // 模拟扩展可用
    mockWebGL2RenderingContext.getExtension = jest.fn().mockImplementation((name) => {
      return { name };
    });

    renderer.init(mockContainer);
    const extensions = renderer.getWebGL2Extensions();

    expect(extensions.length).toBeGreaterThan(0);
    expect(mockWebGL2RenderingContext.getExtension).toHaveBeenCalled();
  });

  /**
   * 测试SIMD支持检测
   */
  test('SIMD支持检测', () => {
    // 模拟window.Float32x4
    const originalFloat32x4 = (window as any).Float32x4;

    // 模拟Float32x4存在
    (window as any).Float32x4 = jest.fn();

    renderer.init(mockContainer);
    renderer.render(mockChartData, mockChartOptions);

    // 确保处理SIMD数据的方法被调用
    expect(mockWebGL2RenderingContext.drawArrays).toHaveBeenCalled();

    // 恢复原始值
    if (originalFloat32x4) {
      (window as any).Float32x4 = originalFloat32x4;
    } else {
      delete (window as any).Float32x4;
    }
  });

  /**
   * 测试渲染状态管理
   */
  test('渲染状态管理', () => {
    renderer.init(mockContainer);

    // 第一次渲染
    renderer.render(mockChartData, mockChartOptions);

    // 清除之前的调用记录
    jest.clearAllMocks();

    // 设置动画模式，应该在动画帧中渲染
    renderer.enableAnimation(true);
    expect(global.requestAnimationFrame).toHaveBeenCalled();

    // 禁用动画
    renderer.enableAnimation(false);

    // 设置像素比
    const newRatio = 2.5;
    renderer.setPixelRatio(newRatio);

    // 应该调整大小并重新渲染
    expect(mockWebGL2RenderingContext.viewport).toHaveBeenCalled();
  });
});
