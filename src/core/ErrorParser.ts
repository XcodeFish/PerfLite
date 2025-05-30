/* eslint-disable @typescript-eslint/no-unused-vars */
import { md5 } from '../utils';
import { IParsedError, IParseOptions } from '../types';
// import { WasmParser } from '@/parser/wasm';
import { MemoryCache } from '../cache/Memory';
import { parser as parserFactory } from '../parser';

// 定义 APICounter 类作为 ErrorParser 的一部分
/**
 * API调用计数器，控制DeepSeek API的使用量
 */
/* 暂时未使用，保留代码结构以备后用
class APICounter {
  private count: number;
  private readonly MAX_FREE: number = 1000;
  private lastResetDate: number;

  constructor() {
    const storedCount = localStorage.getItem('deepseek_api_count');
    const storedDate = localStorage.getItem('deepseek_api_timestamp');

    this.count = storedCount ? parseInt(storedCount, 10) : 0;
    this.lastResetDate = storedDate ? parseInt(storedDate, 10) : Date.now();

    // 每天重置计数器
    this.checkAndResetDaily();
  }

  public check(): boolean {
    this.checkAndResetDaily();
    return this.count < this.MAX_FREE;
  }

  public increment(): void {
    this.checkAndResetDaily();
    if (this.count < this.MAX_FREE) {
      this.count++;
      this.saveState();
    }
  }

  private checkAndResetDaily(): void {
    const now = new Date();
    const lastDate = new Date(this.lastResetDate);

    // 如果是新的一天，重置计数器
    if (
      now.getDate() !== lastDate.getDate() ||
      now.getMonth() !== lastDate.getMonth() ||
      now.getFullYear() !== lastDate.getFullYear()
    ) {
      this.count = 0;
      this.lastResetDate = now.getTime();
      this.saveState();
    }
  }

  private saveState(): void {
    localStorage.setItem('deepseek_api_count', this.count.toString());
    localStorage.setItem('deepseek_api_timestamp', this.lastResetDate.toString());
  }
}
*/

export class ErrorParser {
  // 标记为使用或删除未使用的实例变量
  // private wasmParser: WasmParser;
  private cache: MemoryCache<IParsedError>;
  private complexStackThreshold: number;
  // private apiCounter: APICounter;

  constructor(
    options: {
      complexStackThreshold?: number;
      useDeepseek?: boolean;
      maxCacheItems?: number;
    } = {}
  ) {
    this.complexStackThreshold = options.complexStackThreshold || 5;
    // 我们不再直接使用wasmParser，而是通过parserFactory来处理
    // this.wasmParser = new WasmParser();
    this.cache = new MemoryCache<IParsedError>(options.maxCacheItems || 50);
    // 未使用的API计数器
    // this.apiCounter = new APICounter();

    // 配置DeepSeek
    if (options.useDeepseek !== undefined) {
      parserFactory.configureDeepSeek({
        enabled: options.useDeepseek,
      });
    }

    // 设置智能路由的复杂栈阈值
    parserFactory.setComplexStackThreshold(this.complexStackThreshold);
  }

  /**
   * 解析错误对象或错误栈字符串
   * @param error 错误对象或错误栈字符串
   * @param options 解析选项
   * @returns 解析后的错误信息
   */
  public async parse(error: Error | string, options: IParseOptions = {}): Promise<IParsedError> {
    const stack = typeof error === 'string' ? error : error.stack || '';
    const message = typeof error === 'string' ? '' : error.message;
    const name = typeof error === 'string' ? 'Error' : error.name;

    // 如果启用了数据脱敏
    const sanitizedStack = options.sanitize ? this.sanitize(stack) : stack;

    // 生成缓存键
    const cacheKey = md5(sanitizedStack);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 使用智能解析器工厂解析错误栈
    try {
      const frames = await parserFactory.parseStack(sanitizedStack);

      // 创建解析结果
      const parsed: IParsedError = {
        message,
        name,
        stack: sanitizedStack,
        timestamp: Date.now(),
        type: this.determineErrorType(message, name),
        parsedStack: frames,
        frames: frames,
        source: frames.length > this.complexStackThreshold ? 'deepseek' : 'local',
      };

      // 缓存结果
      this.cache.set(cacheKey, parsed);
      return parsed;
    } catch (e) {
      // 降级到基础解析
      return this.createBasicError(sanitizedStack, message, name);
    }
  }

  /**
   * 确定错误类型
   */
  private determineErrorType(
    message: string,
    name: string
  ): 'syntax' | 'reference' | 'type' | 'network' | 'promise' | 'range' | 'unknown' {
    if (name === 'TypeError') return 'type';
    if (name === 'ReferenceError') return 'reference';
    if (name === 'SyntaxError') return 'syntax';
    if (name === 'RangeError') return 'range';
    if (name.includes('Promise') || message.includes('promise') || message.includes('async'))
      return 'promise';
    if (name === 'NetworkError' || message.includes('network') || message.includes('fetch'))
      return 'network';
    return 'unknown';
  }

  /**
   * 创建基础错误对象（降级方案）
   */
  private createBasicError(stack: string, message: string, name: string): IParsedError {
    // 使用简单的正则表达式解析栈帧
    const frames = this.parseBasicStackFrames(stack);

    return {
      message: message || stack.split('\n')[0] || '',
      name: name || 'Error',
      stack,
      timestamp: Date.now(),
      type: this.determineErrorType(message, name),
      parsedStack: frames,
      frames: frames,
      source: 'fallback',
    };
  }

  /**
   * 基础的栈帧解析（降级方案）
   */
  private parseBasicStackFrames(stack: string): Array<{
    functionName: string;
    fileName: string;
    lineNumber: number;
    columnNumber: number;
  }> {
    const frames: Array<{
      functionName: string;
      fileName: string;
      lineNumber: number;
      columnNumber: number;
    }> = [];
    const lines = stack.split('\n').slice(1); // 跳过第一行（错误消息）

    for (const line of lines) {
      const atMatch = line.match(/at\s+(?:(.+?)\s+\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))/);
      if (atMatch) {
        if (atMatch[1]) {
          frames.push({
            functionName: atMatch[1] || '<anonymous>',
            fileName: atMatch[2] || '<unknown>',
            lineNumber: parseInt(atMatch[3], 10) || 0,
            columnNumber: parseInt(atMatch[4], 10) || 0,
          });
        } else {
          frames.push({
            functionName: '<anonymous>',
            fileName: atMatch[5] || '<unknown>',
            lineNumber: parseInt(atMatch[6], 10) || 0,
            columnNumber: parseInt(atMatch[7], 10) || 0,
          });
        }
      }
    }

    return frames;
  }

  /**
   * 数据脱敏处理
   */
  private sanitize(stack: string): string {
    return stack.replace(/(password|token|key|secret|auth)=[^&\s]+/gi, '$1=[REDACTED]');
  }
}
