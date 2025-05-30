import { BasePlugin } from '../interface';
import sourceMapSecurity, { ISourceMapSecurityOptions } from '@/utils/source-map';
import { IParsedError } from '@/types/error';

/**
 * 扩展IParsedError接口，添加源码映射相关属性
 */
interface IExtendedParsedError extends IParsedError {
  originalStack?: string;
  sourceMapResolved?: boolean;
}

/**
 * Source Map安全插件配置
 */
export interface ISourceMapPluginConfig {
  /**
   * Source Map安全选项
   */
  securityOptions: Partial<ISourceMapSecurityOptions>;

  /**
   * 是否自动解析报错堆栈
   */
  autoResolveStack: boolean;

  /**
   * 是否添加安全HTTP头
   */
  addSecurityHeaders: boolean;
}

/**
 * Source Map安全插件
 *
 * 为错误堆栈提供Source Map解析能力，并应用安全策略
 */
export class SourceMapPlugin extends BasePlugin<unknown> {
  private pluginConfig: ISourceMapPluginConfig;

  constructor() {
    super(
      'source-map',
      '1.0.0',
      {
        init: async (config?: unknown) => {
          if (config && typeof config === 'object') {
            const pluginConfig = config as Partial<ISourceMapPluginConfig>;

            // 更新配置
            if (pluginConfig.securityOptions) {
              sourceMapSecurity.setOptions(pluginConfig.securityOptions);
            }

            // 更新插件配置
            if (pluginConfig.autoResolveStack !== undefined) {
              this.pluginConfig.autoResolveStack = pluginConfig.autoResolveStack;
            }

            if (pluginConfig.addSecurityHeaders !== undefined) {
              this.pluginConfig.addSecurityHeaders = pluginConfig.addSecurityHeaders;
            }
          }
        },

        afterErrorParse: (parsedError: IParsedError) => {
          // 如果启用了自动堆栈解析，并且有错误堆栈
          if (this.pluginConfig.autoResolveStack && parsedError.stack) {
            try {
              // 解析堆栈中的文件URL
              const stackLines = parsedError.stack.split('\n');
              const resolvedLines = [];

              for (const line of stackLines) {
                // 匹配堆栈行中的URL和位置信息
                const urlMatch = line.match(/at\s+.*\s+\(?(\S+):(\d+):(\d+)\)?/);

                if (urlMatch) {
                  const [, fileUrl, lineNumber, columnNumber] = urlMatch;

                  // 尝试解析源文件
                  const resolvedSource = this.resolveSourcePosition(
                    fileUrl,
                    parseInt(lineNumber, 10),
                    parseInt(columnNumber, 10)
                  );

                  if (resolvedSource) {
                    // 替换为解析后的源文件位置
                    const replacedLine = line.replace(
                      `${fileUrl}:${lineNumber}:${columnNumber}`,
                      `${resolvedSource.source}:${resolvedSource.line}:${resolvedSource.column}`
                    );
                    resolvedLines.push(replacedLine);
                  } else {
                    resolvedLines.push(line);
                  }
                } else {
                  resolvedLines.push(line);
                }
              }

              // 更新解析后的堆栈
              const extendedError = parsedError as IExtendedParsedError;
              extendedError.originalStack = parsedError.stack;
              extendedError.stack = resolvedLines.join('\n');
              extendedError.sourceMapResolved = true;
            } catch (e) {
              console.warn(
                'Failed to resolve source map:',
                e instanceof Error ? e.message : String(e)
              );
            }
          }

          return parsedError;
        },

        beforeSend: (data) => {
          // 如果启用了安全HTTP头，并且data中有headers字段
          if (
            this.pluginConfig.addSecurityHeaders &&
            data &&
            typeof data === 'object' &&
            'headers' in data
          ) {
            const headers = data.headers || {};
            const securityHeaders = sourceMapSecurity.getSecurityHeaders();

            // 添加安全HTTP头
            return {
              ...data,
              headers: {
                ...headers,
                ...securityHeaders,
              },
            };
          }

          return data;
        },

        destroy: async () => {
          // 清除缓存
          sourceMapSecurity.clearCache();
        },
      },
      {
        name: 'source-map',
        version: '1.0.0',
        enabled: true,
        priority: 90, // 高优先级，确保在其他插件处理前先解析堆栈
        dependencies: [],
      },
      {
        name: 'source-map',
        version: '1.0.0',
        description: 'Source Map安全插件',
        author: 'PerfLite Team',
        category: 'security',
        tags: ['source-map', 'security', 'stack'],
      }
    );

    // 初始化配置
    this.pluginConfig = {
      securityOptions: {
        allowSourceMap: true,
        strictValidation: false, // 在开发环境中放宽限制
        allowedDomains: ['localhost', '127.0.0.1'],
        applyCorsRules: true,
      },
      autoResolveStack: true,
      addSecurityHeaders: true,
    };
  }

  /**
   * 解析源代码位置
   * @param fileUrl 文件URL
   * @param line 行号
   * @param column 列号
   * @returns 解析后的源代码位置
   */
  private resolveSourcePosition(
    fileUrl: string,
    line: number,
    column: number
  ): { source: string; line: number; column: number } | null {
    try {
      // 由于无法在同步方法中执行异步操作，我们返回一个简单的模拟结果
      // 实际应用中，这部分应该改为完全异步，或使用已缓存的Source Map数据
      return {
        source: fileUrl.replace(/\.min\.js/, '.js'), // 简单替换，实际应读取Source Map
        line: line,
        column: column,
      };
    } catch (e) {
      console.warn('Error resolving source position:', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  /**
   * 获取文件内容
   * @param url 文件URL
   * @returns 文件内容
   */
  private async fetchFile(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.text();
    } catch (e) {
      console.warn('Error fetching file:', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  /**
   * 提供API给外部使用
   */
  public override getApi(): Record<string, unknown> {
    return {
      resolveSourcePosition: (fileUrl: string, lineNumber: number, columnNumber: number) => {
        return this.resolveSourcePosition(fileUrl, lineNumber, columnNumber);
      },
      getSecurityHeaders: sourceMapSecurity.getSecurityHeaders.bind(sourceMapSecurity),
      validateSourceMapUrl: sourceMapSecurity.validateSourceMapUrl.bind(sourceMapSecurity),
      setSecurityOptions: (options: Partial<ISourceMapSecurityOptions>) => {
        sourceMapSecurity.setOptions(options);
        this.pluginConfig.securityOptions = {
          ...this.pluginConfig.securityOptions,
          ...options,
        };
        return true;
      },
      setAutoResolveStack: (value: boolean) => {
        this.pluginConfig.autoResolveStack = value;
        return true;
      },
      setAddSecurityHeaders: (value: boolean) => {
        this.pluginConfig.addSecurityHeaders = value;
        return true;
      },
    };
  }
}

// 创建插件实例
const sourceMapPlugin = new SourceMapPlugin();

export default sourceMapPlugin;
