/**
 * 错误信息类型定义
 */
export interface IErrorInfo {
  message: string;
  stack: string;
  timestamp: number;
  type: string;
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

/**
 * 调用栈帧结构
 */
export interface IStackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  source?: string;
}

/**
 * 性能指标引用（避免循环依赖）
 */
export interface IPerformanceMetricRef {
  name: string;
  value: number;
  timestamp: number;
  unit: string;
  source?: string;
}

/**
 * 解析后的错误信息
 */
export interface IParsedError extends IErrorInfo {
  parsedStack: IStackFrame[];
  relatedMetrics?: IPerformanceMetricRef[];
}

/**
 * 错误解析器配置
 */
export interface IErrorParserConfig {
  complexStackThreshold: number;
  sanitize: boolean;
  sourcemapSupport: boolean;
}

/**
 * 错误解析器接口
 */
export interface IErrorParser {
  parse(stack: string): Promise<IParsedError>;
  parseSync(stack: string): IParsedError;
  setConfig(config: Partial<IErrorParserConfig>): void;
  getConfig(): IErrorParserConfig;
}
