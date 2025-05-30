/**
 * 解析器模块的Mock版本，仅用于构建
 */
import { IStackFrame } from '../types';

/**
 * 解析器工厂
 */
export class ParserFactory {
  private static instance: ParserFactory;

  private constructor() {}

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
  public async parseStack(/* stack */): Promise<IStackFrame[]> {
    return [];
  }
}

// 导出默认解析器实例
export const parser = ParserFactory.getInstance();
