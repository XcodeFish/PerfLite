import { IStackFrame, IParsedError } from '@/types';

// 全局配置
let globalConfig: {
  apiKey?: string;
  baseUrl?: string;
  quotaMode?: 'standard' | 'economy';
} = {};

export class DeepSeekClient {
  private apiKey: string;
  private baseUrl: string;
  private quotaMode: 'standard' | 'economy';

  /**
   * 设置全局DeepSeek配置
   * @param config 全局配置对象
   */
  static configure(config: {
    apiKey?: string;
    baseUrl?: string;
    quotaMode?: 'standard' | 'economy';
  }): void {
    globalConfig = { ...config };
  }

  constructor(
    options: {
      apiKey?: string;
      baseUrl?: string;
      quotaMode?: 'standard' | 'economy';
    } = {}
  ) {
    // 优先使用实例配置，其次使用全局配置，最后使用默认值或环境变量
    this.apiKey = options.apiKey || globalConfig.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl =
      options.baseUrl ||
      globalConfig.baseUrl ||
      process.env.DEEPSEEK_API_URL ||
      'https://api.deepseek.com';
    this.quotaMode = options.quotaMode || globalConfig.quotaMode || 'standard';
  }

  /**
   * 解析错误栈
   */
  public async parseError(stack: string): Promise<IParsedError> {
    // 验证API密钥是否存在
    if (!this.apiKey) {
      console.warn('DeepSeek API密钥未配置，将使用基本解析');
      return this.createBasicError(stack, '未配置API密钥');
    }

    try {
      const response = await this.callAPI(stack);
      return this.formatResponse(response, stack);
    } catch (error) {
      // 发生错误时返回一个基本的解析结果
      return this.createBasicError(stack, String(error));
    }
  }

  /**
   * 调用DeepSeek API
   */
  private async callAPI(stack: string): Promise<any> {
    // 超时控制
    const timeout = 10000; // 10秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'Quota-Mode': this.quotaMode,
        },
        body: JSON.stringify({
          prompt:
            'Parse this JavaScript error stack trace and provide detailed analysis: \n\n' + stack,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('API调用超时');
      }
      throw error;
    }
  }

  /**
   * 格式化API响应
   */
  private formatResponse(response: any, originalStack: string): IParsedError {
    // 假设DeepSeek API返回的是结构化数据
    // 实际实现可能需要根据真实API响应调整

    // 如果返回的是非结构化文本，需要提取关键信息
    let parsedStack: IStackFrame[] = [];
    let message = '';
    let type: 'syntax' | 'reference' | 'type' | 'network' | 'promise' | 'range' | 'unknown' =
      'unknown';
    let name = 'Error';

    if (response.analysis) {
      // 从API的分析中提取信息
      parsedStack = response.frames || [];
      message = response.message || '';
      type = this.mapErrorType(response.errorType || 'unknown');
      name = response.name || 'Error';
    } else {
      // 降级方案：基本解析
      const lines = originalStack.split('\n');
      message = lines[0] || 'Unknown error';

      // 简单解析栈帧
      parsedStack = this.parseStackFrames(originalStack);
    }

    return {
      message,
      name,
      stack: originalStack,
      timestamp: Date.now(),
      type,
      parsedStack,
      frames: parsedStack,
      rootCause: response.rootCause || '未知根本原因',
      suggestions: response.suggestions || [],
      source: 'deepseek',
    };
  }

  /**
   * 映射错误类型
   */
  private mapErrorType(
    type: string
  ): 'syntax' | 'reference' | 'type' | 'network' | 'promise' | 'range' | 'unknown' {
    const typeMap: Record<
      string,
      'syntax' | 'reference' | 'type' | 'network' | 'promise' | 'range' | 'unknown'
    > = {
      TypeError: 'type',
      ReferenceError: 'reference',
      SyntaxError: 'syntax',
      RangeError: 'range',
      NetworkError: 'network',
      PromiseError: 'promise',
    };

    return typeMap[type] || 'unknown';
  }

  /**
   * 简单解析栈帧（降级方案）
   */
  private parseStackFrames(stack: string): IStackFrame[] {
    const frames: IStackFrame[] = [];
    const lines = stack.split('\n').slice(1); // 跳过第一行（错误消息）

    for (const line of lines) {
      const atMatch = line.match(/at\s+(?:(.+?)\s+\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))/);
      if (atMatch) {
        if (atMatch[1]) {
          frames.push({
            functionName: atMatch[1] || '<anonymous>',
            fileName: atMatch[2] || '<unknown>',
            lineNumber: parseInt(atMatch[3], 10) || 0,
            columnNumber: parseInt(atMatch[4], 10) || 0,
          });
        } else {
          frames.push({
            functionName: '<anonymous>',
            fileName: atMatch[5] || '<unknown>',
            lineNumber: parseInt(atMatch[6], 10) || 0,
            columnNumber: parseInt(atMatch[7], 10) || 0,
          });
        }
      }
    }

    return frames;
  }

  /**
   * 创建基本错误对象（降级方案）
   */
  private createBasicError(stack: string, errorMsg: string): IParsedError {
    const parsedStack = this.parseStackFrames(stack);
    return {
      message: stack.split('\n')[0] || errorMsg,
      name: 'Error',
      stack,
      timestamp: Date.now(),
      type: 'unknown',
      parsedStack,
      frames: parsedStack,
      source: 'deepseek-fallback',
    };
  }

  /**
   * 检查DeepSeek服务是否可用
   * @returns 如果服务可用返回true，否则返回false
   */
  public async checkServiceAvailability(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('DeepSeek API密钥未配置，无法检查服务可用性');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error: any) {
      console.error('DeepSeek服务检查失败:', error.message);
      return false;
    }
  }
}
