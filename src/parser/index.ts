/**
 * 解析器模块入口
 */
import { WasmParser } from './wasm';
import { IStackFrame } from '@/types';
import { cacheManager } from '@/cache';
import { md5 } from '@/utils';

/**
 * 解析器工厂
 */
export class ParserFactory {
  private static instance: ParserFactory;
  private wasmParser: WasmParser;
  private complexStackThreshold: number = 5;

  private constructor() {
    this.wasmParser = new WasmParser();
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

    if (isComplex) {
      frames = await this.parseComplexStack(stack);
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
        line.includes('wasm-function')
    );

    return hasComplexFramework;
  }

  /**
   * 解析复杂栈（使用DeepSeek API）
   * 这里是占位符，未来将实现API调用
   */
  private async parseComplexStack(stack: string): Promise<IStackFrame[]> {
    // 目前直接降级到本地解析，后续将实现DeepSeek API调用
    console.log('复杂栈解析，降级到本地解析');
    return await this.wasmParser.parseStackAsync(stack);
  }

  /**
   * 设置复杂栈阈值
   */
  public setComplexStackThreshold(threshold: number): void {
    this.complexStackThreshold = threshold;
  }
}

// 导出默认解析器实例
export const parser = ParserFactory.getInstance();
