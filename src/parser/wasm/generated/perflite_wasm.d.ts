/* tslint:disable */
/* eslint-disable */
export function init_parser(): void;
export function init_simd_parser(): void;
export function parse(stack: string): string;
export function parse_numbers_simd(stack: string): Uint32Array;
export function parse_stack_simd(stack: string): string;
export function parse_line_column_simd(stack: string): Uint32Array;
export function get_version(): string;
export function is_simd_enabled(): boolean;
/**
 * 错误栈解析器
 */
export class ErrorParser {
  private constructor();
  free(): void;
  /**
   * 创建新的错误解析器
   */
  static new(): ErrorParser;
  /**
   * 解析错误栈
   */
  parse(stack: string): string;
  /**
   * 使用SIMD优化解析错误栈
   */
  parse_simd(stack: string): StackFrame[];
}
/**
 * SIMD优化的错误栈解析器
 */
export class SimdParser {
  private constructor();
  free(): void;
  static new(): SimdParser;
  /**
   * 使用SIMD指令加速数字提取
   */
  parse_numbers(input: string): Uint32Array;
  /**
   * 使用SIMD指令加速行列号识别
   */
  parse_line_column(input: string): Uint32Array;
  /**
   * 使用SIMD指令加速完整错误栈解析
   */
  parse_stack_simd(stack: string): StackFrame[];
}
/**
 * 错误栈帧结构
 */
export class StackFrame {
  private constructor();
  free(): void;
  /**
   * 创建新的栈帧
   */
  static new(function_name: string, file_name: string, line_number: number, column_number: number): StackFrame;
  readonly function_name: string;
  readonly file_name: string;
  readonly line_number: number;
  readonly column_number: number;
}
