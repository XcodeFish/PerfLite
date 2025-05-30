/**
 * 解析器模块入口
 */
import { WasmParser } from './wasm';
import { IStackFrame } from '../types';
import { cacheManager } from '../cache';
import { md5 } from '../utils';
import { deepseek } from './deepseek';

/**
 * 解析器工厂
 */
export class ParserFactory {
  private static instance: ParserFactory;
  private wasmParser: WasmParser;
  private complexStackThreshold: number = 5;
  private deepSeekEnabled: boolean = true;
  private deepSeekFallback: 'local' | 'none' = 'local';
  private deepSeekRateLimit: number = 0.3; // 默认30%的复杂错误使用DeepSeek

  private constructor() {
    this.wasmParser = new WasmParser();
    // 检查浏览器环境
    if (typeof navigator !== 'undefined') {
      this.initDeepSeekSettings();
    }
  }

  /**
   * 初始化DeepSeek设置
   */
  private initDeepSeekSettings(): void {
    // 尝试从localStorage读取配置
    try {
      const settings = localStorage.getItem('perflite_deepseek_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.deepSeekEnabled = parsed.enabled !== undefined ? parsed.enabled : true;
        this.deepSeekFallback = parsed.fallback || 'local';
        this.deepSeekRateLimit = parsed.rateLimit !== undefined ? parsed.rateLimit : 0.3;

        // 同步更新DeepSeek实例配置
        deepseek.updateOptions({
          enable: this.deepSeekEnabled,
          fallback: this.deepSeekFallback,
          rateLimit: this.deepSeekRateLimit,
        });
      }
    } catch (e) {
      console.warn('无法读取DeepSeek设置，使用默认值', e);
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ParserFactory {
    if (!ParserFactory.instance) {
      ParserFactory.instance = new ParserFactory();
    }
    return ParserFactory.instance;
  }

  /**
   * 解析错误栈
   */
  public async parseStack(stack: string): Promise<IStackFrame[]> {
    if (!stack) {
      return [];
    }

    // 计算哈希值用于缓存
    const hash = md5(stack);

    // 尝试从缓存获取
    const cached = await cacheManager.get(hash);
    if (cached) {
      return cached as IStackFrame[];
    }

    // 根据栈复杂度判断使用本地解析或DeepSeek API
    const isComplex = this.isComplexStack(stack);
    let frames: IStackFrame[];

    if (isComplex && this.shouldUseDeepSeek()) {
      try {
        frames = await this.parseComplexStack(stack);
      } catch (error) {
        console.warn('使用DeepSeek解析失败，降级到本地解析', error);
        frames = await this.wasmParser.parseStackAsync(stack);
      }
    } else {
      frames = await this.wasmParser.parseStackAsync(stack);
    }

    // 缓存解析结果
    await cacheManager.set(hash, frames);
    return frames;
  }

  /**
   * 判断是否为复杂栈
   */
  private isComplexStack(stack: string): boolean {
    // 简单判断：行数超过阈值、包含特殊标记或递归调用
    const lines = stack.split('\n');
    const frameCount = lines.length;

    // 行数判断
    if (frameCount > this.complexStackThreshold) {
      return true;
    }

    // 特殊框架或标记判断
    const hasComplexFramework = lines.some(
      (line) =>
        line.includes('async_hooks') ||
        line.includes('zone.js') ||
        line.includes('(eval at') ||
        line.includes('wasm-function') ||
        line.includes('webpack-internal:') ||
        line.includes('at async') ||
        line.includes('at Promise.') ||
        line.includes('<anonymous>')
    );

    // 检查递归调用
    const functionNames = lines
      .map((line) => {
        const match = line.match(/at\s+([^\s(]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    const hasDuplicateFunctions = new Set(functionNames).size < functionNames.length;

    return hasComplexFramework || hasDuplicateFunctions;
  }

  /**
   * 判断是否应该使用DeepSeek
   */
  private shouldUseDeepSeek(): boolean {
    if (!this.deepSeekEnabled) {
      return false;
    }

    // 应用频率限制
    if (this.deepSeekRateLimit < 1) {
      return Math.random() <= this.deepSeekRateLimit;
    }

    return true;
  }

  /**
   * 解析复杂栈（使用DeepSeek API）
   */
  private async parseComplexStack(stack: string): Promise<IStackFrame[]> {
    try {
      // 请求DeepSeek API分析错误栈
      const result = await deepseek.parseError(stack);
      return result.parsedStack || [];
    } catch (error) {
      // 如果设置为不降级，则继续抛出错误
      if (this.deepSeekFallback === 'none') {
        throw error;
      }

      // 否则降级到本地解析
      console.warn('DeepSeek API调用失败，降级到本地解析', error);
      return await this.wasmParser.parseStackAsync(stack);
    }
  }

  /**
   * 设置复杂栈阈值
   */
  public setComplexStackThreshold(threshold: number): void {
    this.complexStackThreshold = threshold;
  }

  /**
   * 配置DeepSeek设置
   */
  public configureDeepSeek(options: {
    enabled?: boolean;
    fallback?: 'local' | 'none';
    rateLimit?: number;
    apiKey?: string;
  }): void {
    if (options.enabled !== undefined) {
      this.deepSeekEnabled = options.enabled;
    }

    if (options.fallback) {
      this.deepSeekFallback = options.fallback;
    }

    if (options.rateLimit !== undefined) {
      this.deepSeekRateLimit = Math.max(0, Math.min(1, options.rateLimit));
    }

    // 更新DeepSeek实例配置
    deepseek.updateOptions({
      enable: this.deepSeekEnabled,
      fallback: this.deepSeekFallback,
      rateLimit: this.deepSeekRateLimit,
      apiKey: options.apiKey,
    });

    // 保存到localStorage
    try {
      localStorage.setItem(
        'perflite_deepseek_settings',
        JSON.stringify({
          enabled: this.deepSeekEnabled,
          fallback: this.deepSeekFallback,
          rateLimit: this.deepSeekRateLimit,
        })
      );
    } catch (e) {
      console.warn('无法保存DeepSeek设置', e);
    }
  }

  /**
   * 获取DeepSeek设置
   */
  public getDeepSeekSettings(): {
    enabled: boolean;
    fallback: 'local' | 'none';
    rateLimit: number;
    apiCallCount: number;
  } {
    return {
      enabled: this.deepSeekEnabled,
      fallback: this.deepSeekFallback,
      rateLimit: this.deepSeekRateLimit,
      apiCallCount: deepseek.getApiCallCount(),
    };
  }
}

// 导出默认解析器实例
export const parser = ParserFactory.getInstance();
