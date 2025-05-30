import { IParsedError } from './error';

/**
 * WASM解析器接口
 */
export interface IWasmParser {
  /**
   * 同步解析错误栈
   */
  parseStack(stack: string): import('./error').IStackFrame[];

  /**
   * 异步解析错误栈
   */
  parseStackAsync(stack: string): Promise<import('./error').IStackFrame[]>;
  parseStackSimd(stack: string): IParsedError;
  isLoaded(): boolean;
  loadWasm(): Promise<boolean>;
  getMemoryUsage(): number;
  getParseTime(): number;
  getSupportedFeatures(): IWasmFeatures;
}

/**
 * WASM特性支持情况
 */
export interface IWasmFeatures {
  simd: boolean;
  threads: boolean;
  bulkMemory: boolean;
  referenceTypes: boolean;
  relaxedSimd: boolean;
  gc: boolean;
}

/**
 * WASM加载器配置
 */
export interface IWasmLoaderConfig {
  wasmUrl: string;
  simdSupport: boolean;
  timeout: number;
  retryCount: number;
  memoryLimit?: number;
  fetchOptions?: RequestInit;
  enableThreads?: boolean;
  enableGc?: boolean;
  fallbackUrl?: string;
}

/**
 * WASM加载状态
 */
export interface IWasmLoadingStatus {
  loaded: boolean;
  loading: boolean;
  error?: Error;
  progress?: number;
  bytesLoaded?: number;
  bytesTotal?: number;
  wasmSize?: number;
  loadTime?: number;
  instantiationTime?: number;
}

/**
 * DeepSeek API请求参数
 */
export interface IDeepSeekRequest {
  stack: string;
  context?: string;
  options?: {
    quotaMode?: 'economy' | 'standard';
    maxTokens?: number;
    temperature?: number;
    similarityThreshold?: number;
    excludeLibraries?: boolean;
    includeMetadata?: boolean;
  };
}

/**
 * 源码映射提示类型
 */
export interface ISourceMappingHint {
  originalFileName: string;
  originalLineNumber?: number;
  originalColumnNumber?: number;
  generatedFileName?: string;
  generatedLineNumber?: number;
  generatedColumnNumber?: number;
  sourceRoot?: string;
  source?: string;
  name?: string;
}

/**
 * DeepSeek API响应类型
 */
export interface IDeepSeekResponse {
  parsedError: IParsedError;
  suggestions?: string[];
  sourceMappingHints?: ISourceMappingHint[];
  tokensUsed?: number;
  similar?: {
    score: number;
    errorId: string;
  }[];
  libraries?: {
    name: string;
    version?: string;
    issues?: string[];
  }[];
  metadata?: Record<string, unknown>;
}

/**
 * DeepSeek客户端接口
 */
export interface IDeepSeekClient {
  /**
   * 解析复杂错误栈
   */
  parseComplexStack(stack: string): Promise<import('./error').IStackFrame[]>;

  /**
   * 获取API调用计数
   */
  getCallCount(): number;

  /**
   * 重置API调用计数
   */
  resetCallCount(): void;

  /**
   * 设置API密钥
   */
  setApiKey(key: string): void;
  parseError(request: IDeepSeekRequest): Promise<IDeepSeekResponse>;
  isAvailable(): Promise<boolean>;
  getRemainingQuota(): Promise<number>;
  setConfig(config: Partial<IDeepSeekClientConfig>): void;
  getConfig(): IDeepSeekClientConfig;
  batchProcess(requests: IDeepSeekRequest[]): Promise<IDeepSeekResponse[]>;
  cancelRequest(requestId: string): boolean;
  getRequestStats(): IDeepSeekRequestStats;
}

/**
 * DeepSeek客户端配置
 */
export interface IDeepSeekClientConfig {
  apiKey?: string;
  endpoint: string;
  quotaMode: 'economy' | 'standard';
  timeout: number;
  retryCount: number;
  retryDelay: number;
  concurrency: number;
  maxTokens: number;
  cacheResults: boolean;
  offlineMode: boolean;
  compressionEnabled: boolean;
}

/**
 * DeepSeek请求统计
 */
export interface IDeepSeekRequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  requestsInFlight: number;
  cachedResponses: number;
  rateLimited: number;
  lastRequestTime?: number;
}
