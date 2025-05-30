import { IStackFrame, IParsedError } from '@/types';

export class DeepSeekClient {
  private apiKey: string;
  private baseUrl: string;
  private quotaMode: 'standard' | 'economy';

  constructor(
    options: {
      apiKey?: string;
      baseUrl?: string;
      quotaMode?: 'standard' | 'economy';
    } = {}
  ) {
    this.apiKey = options.apiKey || '';
    this.baseUrl = options.baseUrl || 'https://api.deepseek.com';
    this.quotaMode = options.quotaMode || 'standard';
  }

  /**
   * 解析错误栈
   */
  public async parseError(stack: string): Promise<IParsedError> {
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
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
    let type = 'unknown';
    let name = 'Error';

    if (response.analysis) {
      // 从API的分析中提取信息
      parsedStack = response.frames || [];
      message = response.message || '';
      type = response.errorType || 'unknown';
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
      type: type as any,
      parsedStack,
      frames: parsedStack,
      rootCause: response.rootCause || '未知根本原因',
      suggestions: response.suggestions || [],
      source: 'deepseek',
    };
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
}
