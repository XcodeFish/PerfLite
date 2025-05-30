import { IStackFrame } from '@/types';
import { WasmLoader } from './loader';

/**
 * WASM错误栈解析器
 */
export class WasmParser {
  private loader: WasmLoader;
  private wasmPath: string;
  private fallbackPath: string;
  private initialized: boolean = false;
  private initializationPromise: Promise<boolean> | null = null;

  /**
   * 创建WASM解析器实例
   * @param wasmPath WASM文件路径
   * @param fallbackPath 不支持SIMD时的回退WASM文件路径
   */
  constructor(
    wasmPath: string = '/wasm/parser.wasm',
    fallbackPath: string = '/wasm/parser_no_simd.wasm'
  ) {
    this.loader = WasmLoader.getInstance();
    this.wasmPath = wasmPath;
    this.fallbackPath = fallbackPath;
  }

  /**
   * 初始化WASM解析器
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const wasmInstance = await this.loader.loadModule(this.wasmPath, this.fallbackPath);
        if (!wasmInstance) {
          console.warn('无法加载WASM模块，将使用JS解析');
          return false;
        }

        // 初始化WASM解析器
        const exports = wasmInstance.exports as any;
        if (typeof exports.init_parser === 'function') {
          exports.init_parser();
          this.initialized = true;
          return true;
        } else {
          console.warn('WASM模块缺少init_parser函数');
          return false;
        }
      } catch (error) {
        console.error('WASM初始化失败', error);
        return false;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * 同步解析错误栈（用于兼容性）
   * @param stack 错误栈字符串
   * @returns 解析后的栈帧数组
   */
  public parseStack(stack: string): IStackFrame[] {
    // 由于WASM加载是异步的，同步方法直接使用JS实现
    return this.parseStackJS(stack);
  }

  /**
   * 异步解析错误栈（推荐使用）
   * @param stack 错误栈字符串
   * @returns 解析后的栈帧数组
   */
  public async parseStackAsync(stack: string): Promise<IStackFrame[]> {
    if (!stack || stack.trim() === '') {
      return [];
    }

    // 确保WASM模块已加载
    const wasmInstance = await this.ensureWasmLoaded();

    if (!wasmInstance) {
      // 降级到JS解析
      return this.parseStackJS(stack);
    }

    try {
      // 确保初始化
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult) {
          return this.parseStackJS(stack);
        }
      }

      const exports = wasmInstance.exports as any;
      let jsonResult = '';

      // 尝试使用SIMD优化版本
      if (this.loader.supportsSimd() && typeof exports.parse_stack_simd === 'function') {
        console.log('使用SIMD优化版解析器');
        jsonResult = exports.parse_stack_simd(stack);
      }
      // 回退到普通版本
      else if (typeof exports.parse === 'function') {
        console.log('使用标准解析器');
        jsonResult = exports.parse(stack);
      }
      // 降级到JS解析
      else {
        console.warn('WASM模块缺少parse函数');
        return this.parseStackJS(stack);
      }

      return this.parseJsonResult(jsonResult);
    } catch (error) {
      // 降级到JS解析
      console.warn('WASM解析失败，降级到JS解析', error);
      return this.parseStackJS(stack);
    }
  }

  /**
   * 解析JSON字符串为栈帧数组
   * @param jsonStr WASM返回的JSON字符串
   * @returns 栈帧数组
   */
  private parseJsonResult(jsonStr: string): IStackFrame[] {
    if (!jsonStr || jsonStr === '') {
      return [];
    }

    try {
      const frames = JSON.parse(jsonStr);

      // 确保返回的结果符合IStackFrame接口
      return frames.map((frame: any) => ({
        functionName: frame.function_name || '<anonymous>',
        fileName: frame.file_name || '<unknown>',
        lineNumber: typeof frame.line_number === 'number' ? frame.line_number : 0,
        columnNumber: typeof frame.column_number === 'number' ? frame.column_number : 0,
      }));
    } catch (error) {
      console.error('解析WASM返回结果失败', error);
      return [];
    }
  }

  /**
   * 确保WASM模块已加载
   * @returns WASM实例或null（如果加载失败）
   */
  private async ensureWasmLoaded(): Promise<WebAssembly.Instance | null> {
    if (this.loader.isLoaded()) {
      return this.loader.getInstance();
    }

    return await this.loader.loadModule(this.wasmPath, this.fallbackPath);
  }

  /**
   * JS解析错误栈（降级方案）
   * @param stack 错误栈字符串
   * @returns 解析后的栈帧数组
   */
  private parseStackJS(stack: string): IStackFrame[] {
    if (!stack || stack.trim() === '') {
      return [];
    }

    const frames: IStackFrame[] = [];
    const lines = stack.split('\n');

    // 支持多种格式的错误栈
    // Chrome/Edge: "    at functionName (file:line:column)"
    // Firefox: "functionName@file:line:column"
    // Safari: "functionName@file:line:column"
    // Node.js: "    at functionName (file:line:column)"
    const chromeRegex = /^\s*at\s+(.*?)\s+\((?:(.+?):(\d+):(\d+)|(.+))\)$/;
    const chromeEvalRegex = /^\s*at\s+(.*?)\s+\(eval at\s+(.+?)\s+\((.+?):(\d+):(\d+)\),.*\)$/;
    const firefoxRegex = /^\s*([^@]*)@(.+?):(\d+):(\d+)$/;
    const nodeRegex = /^\s*at\s+(.+?):(\d+):(\d+)$/;

    for (const line of lines) {
      let matched = chromeRegex.exec(line);
      if (matched) {
        frames.push({
          functionName: matched[1] || '<anonymous>',
          fileName: matched[2] || matched[5] || '<unknown>',
          lineNumber: matched[3] ? parseInt(matched[3], 10) : 0,
          columnNumber: matched[4] ? parseInt(matched[4], 10) : 0,
        });
        continue;
      }

      matched = chromeEvalRegex.exec(line);
      if (matched) {
        frames.push({
          functionName: matched[1] || '<anonymous>',
          fileName: matched[3],
          lineNumber: parseInt(matched[4], 10),
          columnNumber: parseInt(matched[5], 10),
        });
        continue;
      }

      matched = firefoxRegex.exec(line);
      if (matched) {
        frames.push({
          functionName: matched[1] || '<anonymous>',
          fileName: matched[2],
          lineNumber: parseInt(matched[3], 10),
          columnNumber: parseInt(matched[4], 10),
        });
        continue;
      }

      matched = nodeRegex.exec(line);
      if (matched) {
        frames.push({
          functionName: '<anonymous>',
          fileName: matched[1],
          lineNumber: parseInt(matched[2], 10),
          columnNumber: parseInt(matched[3], 10),
        });
      }
    }

    return frames;
  }

  /**
   * 重置解析器状态
   */
  public reset(): void {
    this.initialized = false;
    this.initializationPromise = null;
  }
}

/**
 * 导出默认实例，方便直接使用
 */
export const wasmParser = new WasmParser();
