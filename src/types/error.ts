/**
 * 错误信息类型定义
 */
export interface IErrorInfo {
  message: string;
  stack: string;
  timestamp: number;
  type: 'syntax' | 'reference' | 'type' | 'network' | 'promise' | 'unknown';
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  metadata?: Record<string, unknown>;
  name: string;
  frames: IStackFrame[];
  relatedPerformance?: Record<string, any>;
  user?: Record<string, any>;
  browser?: {
    name: string;
    version: string;
    os: string;
  };
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
  rootCause?: string;
  suggestions?: string[];
  frequency?: number;
  firstOccurrence?: number;
  lastOccurrence?: number;
  affectedUsers?: number;
  isRegression?: boolean;
  sourceMappingHints?: {
    originalFileName: string;
    originalLineNumber?: number;
    originalColumnNumber?: number;
  }[];
}

/**
 * 错误解析器配置
 */
export interface IErrorParserConfig {
  complexStackThreshold: number;
  sanitize: boolean;
  sourcemapSupport: boolean;
  useDeepSeek: boolean;
  fallbackToLocal: boolean;
  captureUnhandledRejections: boolean;
  captureConsoleErrors: boolean;
  groupSimilarErrors: boolean;
  maxStackFrames?: number;
}

/**
 * 错误解析器接口
 */
export interface IErrorParser {
  parse(stack: string): Promise<IParsedError>;
  parseSync(stack: string): IParsedError;
  setConfig(config: Partial<IErrorParserConfig>): void;
  getConfig(): IErrorParserConfig;
  correlateWithPerformance(error: IParsedError, metrics: IPerformanceMetricRef[]): IParsedError;
  getSourceMapInfo(fileName: string, lineNumber: number, columnNumber: number): Promise<unknown>;
  sanitizeErrorData(error: IParsedError): IParsedError;
  parseStack(stack: string): Promise<IStackFrame[]>;
}

/**
 * 错误分组信息
 */
export interface IErrorGroup {
  id: string;
  type: string;
  message: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  affectedUsers: Set<string>;
  samples: IParsedError[];
  isSolved: boolean;
}

/**
 * 错误解析选项
 */
export interface IParseOptions {
  sanitize?: boolean;
  maxStackDepth?: number;
}
