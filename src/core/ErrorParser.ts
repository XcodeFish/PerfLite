/* eslint-disable @typescript-eslint/no-unused-vars */
import md5 from 'md5';
import { IParsedError, IParseOptions } from '../types';
import { WasmParser } from '@/parser/wasm';
import { DeepSeekClient } from '@/parser/deepseek/client';
import { MemoryCache } from '../cache/memory';

export class ErrorParser {
  private wasmParser: WasmParser;
  private deepseekClient: DeepSeekClient;
  private cache: MemoryCache<IParsedError>;
  private complexStackThreshold: number;
  private apiCounter: APICounter;

  constructor(
    options: {
      complexStackThreshold?: number;
      useDeepseek?: boolean;
      maxCacheItems?: number;
    } = {}
  ) {
    this.complexStackThreshold = options.complexStackThreshold || 5;
    this.wasmParser = new WasmParser();
    this.deepseekClient = new DeepSeekClient();
    this.cache = new MemoryCache<IParsedError>(options.maxCacheItems || 50);
    this.apiCounter = new APICounter();
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

    // 判断错误栈的复杂度
    const stackLines = sanitizedStack.split('\n');
    const isComplex = stackLines.length > this.complexStackThreshold;

    // 根据复杂度和API配额决定使用哪种解析方式
    let parsed: IParsedError;

    if (isComplex && this.apiCounter.check()) {
      try {
        parsed = await this.parseWithDeepSeek(sanitizedStack, message, name);
        this.apiCounter.increment();
      } catch (e) {
        // 降级到本地解析
        parsed = this.parseWithWasm(sanitizedStack, message, name);
      }
    } else {
      parsed = this.parseWithWasm(sanitizedStack, message, name);
    }

    // 缓存结果
    this.cache.set(cacheKey, parsed);

    return parsed;
  }

  /**
   * 使用WASM解析器解析错误栈
   */
  private parseWithWasm(stack: string, message: string, name: string): IParsedError {
    // 这里使用WASM同步方法的原因是：
    // 1. API一致性，ErrorParser.parseWithWasm设计是同步
    // 2.简单错误处理效率，对于简单错误（少于5层调用栈），WASM同步解析更快
    // 降级策略：同步方法直接使用JS实现，提供了一个立即可用的降级方案，避免初始化延迟
    // 用户体验：对于常见错误，提供即时响应比等待WASM加载更重要
    // 错误处理流程：错误解析通常需要立即结果用于显示或记录，同步API简化了这一流程
    const frames = this.wasmParser.parseStack(stack);

    return {
      message,
      name,
      stack,
      timestamp: Date.now(),
      source: 'local',
      type: 'unknown',
      parsedStack: frames,
      frames: frames,
    };
  }

  /**
   * 使用DeepSeek API解析复杂错误栈
   */
  private async parseWithDeepSeek(
    stack: string,
    message: string,
    name: string
  ): Promise<IParsedError> {
    const result = await this.deepseekClient.parseError(stack);

    return {
      message,
      name,
      stack,
      timestamp: Date.now(),
      source: 'deepseek',
      type: 'unknown',
      parsedStack: result.parsedStack,
      frames: result.parsedStack,
    };
  }

  /**
   * 数据脱敏处理
   */
  private sanitize(stack: string): string {
    return stack.replace(/(password|token|key)=[^&\s]+/gi, '$1=[REDACTED]');
  }
}

/**
 * API调用计数器，控制DeepSeek API的使用量
 */
class APICounter {
  private count: number;
  private readonly MAX_FREE: number = 1000;

  constructor() {
    this.count = parseInt(localStorage.getItem('deepseek_api_count') || '0', 10);
  }

  public check(): boolean {
    return this.count < this.MAX_FREE;
  }

  public increment(): void {
    if (this.count < this.MAX_FREE) {
      this.count++;
      localStorage.setItem('deepseek_api_count', this.count.toString());
    }
  }
}
