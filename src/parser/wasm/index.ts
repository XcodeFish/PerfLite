import { IStackFrame } from '@/types';
import { WasmLoader } from './loader';

/**
 * WASM错误栈解析器
 */
export class WasmParser {
  private loader: WasmLoader;
  private wasmPath: string;

  constructor(wasmPath: string = '/wasm/parser.wasm') {
    this.loader = WasmLoader.getInstance();
    this.wasmPath = wasmPath;
  }

  /**
   * 同步解析错误栈（用于兼容性）
   */
  public parseStack(stack: string): IStackFrame[] {
    // 由于WASM加载是异步的，同步方法直接使用JS实现
    return this.parseStackJS(stack);
  }

  /**
   * 异步解析错误栈（推荐使用）
   */
  public async parseStackAsync(stack: string): Promise<IStackFrame[]> {
    // 确保WASM模块已加载
    const wasmInstance = await this.ensureWasmLoaded();

    if (!wasmInstance) {
      // 降级到JS解析
      return this.parseStackJS(stack);
    }

    try {
      // 调用WASM解析函数
      return (wasmInstance.exports as any).parse_stack(stack);
    } catch (error) {
      // 降级到JS解析
      console.warn('WASM解析失败，降级到JS解析', error);
      return this.parseStackJS(stack);
    }
  }

  /**
   * 确保WASM模块已加载
   */
  private async ensureWasmLoaded(): Promise<WebAssembly.Instance | null> {
    if (this.loader.isLoaded()) {
      return this.loader.getInstance();
    }

    return await this.loader.loadModule(this.wasmPath);
  }

  /**
   * JS解析错误栈
   */
  private parseStackJS(stack: string): IStackFrame[] {
    const frames: IStackFrame[] = [];
    const lines = stack.split('\n');

    // 简单的Chrome/Firefox错误栈解析
    const chromeRegex = /^\s*at\s+(.*?)\s+\((?:(.+?):(\d+):(\d+)|(.+))\)$/;
    const chromeEvalRegex = /^\s*at\s+(.*?)\s+\(eval at\s+(.+?)\s+\((.+?):(\d+):(\d+)\),.*\)$/;
    const firefoxRegex = /^\s*([^@]*)@(.+?):(\d+):(\d+)$/;

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
      }
    }

    return frames;
  }
}

/**
 * 导出默认实例，方便直接使用
 */
export const wasmParser = new WasmParser();
