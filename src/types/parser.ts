import { IParsedError } from './error';

/**
 * WASM解析器接口
 */
export interface IWasmParser {
  parseStack(stack: string): IParsedError;
  parseStackSimd(stack: string): IParsedError;
  isLoaded(): boolean;
  loadWasm(): Promise<boolean>;
}

/**
 * WASM加载器配置
 */
export interface IWasmLoaderConfig {
  wasmUrl: string;
  simdSupport: boolean;
  timeout: number;
  retryCount: number;
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
}

/**
 * DeepSeek API响应类型
 */
export interface IDeepSeekResponse {
  parsedError: IParsedError;
  suggestions?: string[];
  sourceMappingHints?: ISourceMappingHint[];
  tokensUsed?: number;
}

/**
 * DeepSeek客户端接口
 */
export interface IDeepSeekClient {
  parseError(request: IDeepSeekRequest): Promise<IDeepSeekResponse>;
  isAvailable(): Promise<boolean>;
  getRemainingQuota(): Promise<number>;
}
