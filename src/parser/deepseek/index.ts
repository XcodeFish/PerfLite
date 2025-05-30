/**
 * DeepSeek解析器模块 - 封装DeepSeek API调用
 */

import { IParsedError } from '@/types';
import { DeepSeekClient } from './client';

/**
 * DeepSeek配置选项
 */
export interface IDeepSeekOptions {
  /**
   * API密钥
   */
  apiKey?: string;

  /**
   * API基础URL
   */
  baseUrl?: string;

  /**
   * 配额模式: 'standard'(标准)或'economy'(经济)
   */
  quotaMode?: 'standard' | 'economy';

  /**
   * 是否启用，默认为true
   */
  enable?: boolean;

  /**
   * 失败时降级策略: 'local'(本地解析)或'none'(不降级)
   */
  fallback?: 'local' | 'none';

  /**
   * API调用频率限制，范围0-1
   * 例如：0.3表示30%的复杂错误使用DeepSeek V3
   */
  rateLimit?: number;

  /**
   * 模型名称
   */
  model?: string;
}

/**
 * 默认配置
 */
export const DEFAULT_DEEPSEEK_OPTIONS: IDeepSeekOptions = {
  enable: true,
  fallback: 'local',
  rateLimit: 1, // 默认100%使用
  quotaMode: 'economy',
  model: 'deepseek-v3-community',
};

/**
 * DeepSeek解析器 - 提供智能错误分析
 */
export class DeepSeek {
  private client: DeepSeekClient;
  private options: IDeepSeekOptions;
  private apiCallCounter: number = 0;
  private apiCallLimit: number = 1000; // 社区版每日限额

  /**
   * 创建DeepSeek解析器实例
   * @param options 配置选项
   */
  constructor(options: IDeepSeekOptions = {}) {
    this.options = { ...DEFAULT_DEEPSEEK_OPTIONS, ...options };

    this.client = new DeepSeekClient({
      apiKey: this.options.apiKey,
      baseUrl: this.options.baseUrl,
      quotaMode: this.options.quotaMode,
    });

    // 从本地存储恢复API调用计数
    this.loadApiCounter();
  }

  /**
   * 解析错误栈
   * @param stack 错误栈
   * @returns 解析后的错误信息
   */
  public async parseError(stack: string): Promise<IParsedError> {
    // 检查是否启用
    if (!this.options.enable) {
      throw new Error('DeepSeek API is disabled');
    }

    // 检查API调用限额
    if (!this.checkApiLimit()) {
      throw new Error('DeepSeek API daily limit reached');
    }

    // 检查频率限制
    if (!this.checkRateLimit()) {
      throw new Error('DeepSeek API rate limit applied');
    }

    try {
      // 调用API
      const result = await this.client.parseError(stack);

      // 增加计数器
      this.incrementApiCounter();

      return result;
    } catch (error) {
      if (this.options.fallback === 'local') {
        throw error; // 让调用者处理降级逻辑
      }
      throw error;
    }
  }

  /**
   * 检查API调用限额
   */
  private checkApiLimit(): boolean {
    return this.apiCallCounter < this.apiCallLimit;
  }

  /**
   * 检查频率限制
   */
  private checkRateLimit(): boolean {
    if (this.options.rateLimit === 1) {
      return true; // 无频率限制
    }

    // 使用随机数模拟频率限制
    return Math.random() < (this.options.rateLimit || 1);
  }

  /**
   * 增加API调用计数
   */
  private incrementApiCounter(): void {
    this.apiCallCounter++;
    localStorage.setItem('deepseek_api_count', this.apiCallCounter.toString());
  }

  /**
   * 从本地存储加载API调用计数
   */
  private loadApiCounter(): void {
    const count = localStorage.getItem('deepseek_api_count');
    if (count) {
      const timestamp = localStorage.getItem('deepseek_api_timestamp');
      const now = new Date();

      // 如果是新的一天，重置计数器
      if (timestamp) {
        const date = new Date(parseInt(timestamp, 10));
        if (
          date.getDate() !== now.getDate() ||
          date.getMonth() !== now.getMonth() ||
          date.getFullYear() !== now.getFullYear()
        ) {
          this.resetApiCounter();
          return;
        }
      }

      this.apiCallCounter = parseInt(count, 10);
    } else {
      this.resetApiCounter();
    }
  }

  /**
   * 重置API调用计数
   */
  private resetApiCounter(): void {
    this.apiCallCounter = 0;
    localStorage.setItem('deepseek_api_count', '0');
    localStorage.setItem('deepseek_api_timestamp', Date.now().toString());
  }

  /**
   * 获取当前API调用计数
   */
  public getApiCallCount(): number {
    return this.apiCallCounter;
  }

  /**
   * 获取API调用限额
   */
  public getApiCallLimit(): number {
    return this.apiCallLimit;
  }

  /**
   * 获取当前配置
   */
  public getOptions(): IDeepSeekOptions {
    return { ...this.options };
  }

  /**
   * 更新配置
   */
  public updateOptions(options: Partial<IDeepSeekOptions>): void {
    this.options = { ...this.options, ...options };

    // 更新客户端配置
    if (options.apiKey || options.baseUrl || options.quotaMode) {
      this.client = new DeepSeekClient({
        apiKey: this.options.apiKey,
        baseUrl: this.options.baseUrl,
        quotaMode: this.options.quotaMode,
      });
    }
  }
}

/**
 * 导出默认实例
 */
export const deepseek = new DeepSeek();

/**
 * 默认导出
 */
export default deepseek;
