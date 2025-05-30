import { sanitizeUrl } from './sanitize';

/**
 * Source Map安全协议配置
 */
export interface ISourceMapSecurityOptions {
  /**
   * 是否允许加载Source Map
   */
  allowSourceMap: boolean;

  /**
   * 是否严格验证Source Map来源
   */
  strictValidation: boolean;

  /**
   * 允许的Source Map域名列表
   */
  allowedDomains: string[];

  /**
   * 默认CDN域名
   */
  cdnDomain?: string;

  /**
   * 安全令牌
   */
  securityToken?: string;

  /**
   * 是否应用CORS规则
   */
  applyCorsRules: boolean;

  /**
   * 超时时间(毫秒)
   */
  timeout: number;
}

/**
 * 默认Source Map安全配置
 */
const DEFAULT_OPTIONS: ISourceMapSecurityOptions = {
  allowSourceMap: false, // 默认不允许加载Source Map
  strictValidation: true, // 默认严格验证
  allowedDomains: [], // 默认不允许任何域名
  applyCorsRules: true, // 默认应用CORS规则
  timeout: 5000, // 默认超时5秒
};

/**
 * Source Map安全协议
 * 用于安全地加载和验证Source Map
 */
export class SourceMapSecurity {
  private options: ISourceMapSecurityOptions;
  private sourceMapCache: Map<string, string> = new Map();

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: Partial<ISourceMapSecurityOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * 设置配置
   * @param options 新配置
   */
  public setOptions(options: Partial<ISourceMapSecurityOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * 验证Source Map URL是否安全
   * @param sourceMapUrl Source Map URL
   * @returns 是否安全
   */
  public validateSourceMapUrl(sourceMapUrl: string): boolean {
    if (!this.options.allowSourceMap) {
      return false;
    }

    try {
      // 解析URL
      const url = new URL(sourceMapUrl);

      // 验证域名
      if (this.options.strictValidation) {
        const hostname = url.hostname;

        // 检查是否在允许的域名列表中
        if (
          !this.options.allowedDomains.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
          )
        ) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // URL解析失败
      console.error('URL解析失败', error);
      return false;
    }
  }

  /**
   * 安全地加载Source Map
   * @param sourceMapUrl Source Map URL
   * @returns Source Map内容Promise
   */
  public async loadSourceMap(sourceMapUrl: string): Promise<string | null> {
    // 如果URL不安全，拒绝加载
    if (!this.validateSourceMapUrl(sourceMapUrl)) {
      console.warn(`Source Map URL rejected: ${sanitizeUrl(sourceMapUrl)}`);
      return null;
    }

    // 检查缓存
    if (this.sourceMapCache.has(sourceMapUrl)) {
      return this.sourceMapCache.get(sourceMapUrl) || null;
    }

    try {
      // 创建AbortController用于超时
      const controller = new AbortController();
      const { signal } = controller;

      // 设置超时
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      // 构建请求选项
      const fetchOptions: RequestInit = {
        method: 'GET',
        credentials: this.options.applyCorsRules ? 'same-origin' : 'include',
        signal,
      };

      // 添加安全令牌
      if (this.options.securityToken) {
        fetchOptions.headers = {
          'X-SourceMap-Token': this.options.securityToken,
        };
      }

      // 加载Source Map
      const response = await fetch(sourceMapUrl, fetchOptions);
      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`Failed to load Source Map: ${response.status} ${response.statusText}`);
      }

      // 解析响应
      const sourceMapContent = await response.text();

      // 缓存Source Map
      this.sourceMapCache.set(sourceMapUrl, sourceMapContent);

      return sourceMapContent;
    } catch (error) {
      console.error(
        `Error loading Source Map: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * 从JS文件中提取Source Map URL
   * @param jsContent JS文件内容
   * @returns Source Map URL或null
   */
  public extractSourceMapUrl(jsContent: string): string | null {
    if (!jsContent) return null;

    // 查找Source Map注释
    // 格式: //# sourceMappingURL=url 或 /*# sourceMappingURL=url */
    const sourceMapRegex =
      /\/\/[#@]\s*sourceMappingURL\s*=\s*(\S+)|\/\*[#@]\s*sourceMappingURL\s*=\s*(\S+)\s*\*\//;
    const match = jsContent.match(sourceMapRegex);

    if (match) {
      // 返回匹配到的URL
      return match[1] || match[2] || null;
    }

    return null;
  }

  /**
   * 根据JS URL构建Source Map URL
   * @param jsUrl JS文件URL
   * @param mapPath Source Map相对路径
   * @returns 完整的Source Map URL
   */
  public buildSourceMapUrl(jsUrl: string, mapPath: string): string {
    try {
      // 如果mapPath是绝对URL，直接返回
      if (mapPath.match(/^https?:\/\//)) {
        return mapPath;
      }

      // 解析JS URL
      const url = new URL(jsUrl);

      // 如果mapPath是绝对路径，直接拼接域名
      if (mapPath.startsWith('/')) {
        return `${url.protocol}//${url.host}${mapPath}`;
      }

      // 获取JS文件所在目录
      const jsPath = url.pathname;
      const jsDir = jsPath.substring(0, jsPath.lastIndexOf('/') + 1);

      // 拼接Source Map URL
      return `${url.protocol}//${url.host}${jsDir}${mapPath}`;
    } catch (error) {
      // URL解析失败，返回null
      console.error('URL解析失败', error);
      return '';
    }
  }

  /**
   * 验证Source Map文件内容是否安全
   * @param content Source Map内容
   * @returns 是否安全
   */
  public validateSourceMapContent(content: string): boolean {
    if (!content) return false;

    try {
      // 解析Source Map
      const sourceMap = JSON.parse(content);

      // 必须包含必要的字段
      if (!sourceMap.version || !sourceMap.sources || !sourceMap.mappings) {
        return false;
      }

      // 版本必须是合法的
      if (typeof sourceMap.version !== 'number' || sourceMap.version < 1 || sourceMap.version > 3) {
        return false;
      }

      // 源文件列表必须是数组
      if (!Array.isArray(sourceMap.sources)) {
        return false;
      }

      // 映射必须是字符串
      if (typeof sourceMap.mappings !== 'string') {
        return false;
      }

      return true;
    } catch (error) {
      // 解析失败
      console.error('Source Map解析失败', error);
      return false;
    }
  }

  /**
   * 清除Source Map缓存
   */
  public clearCache(): void {
    this.sourceMapCache.clear();
  }

  /**
   * 应用Source Map HTTP安全头
   * 返回推荐的安全HTTP头配置
   */
  public getSecurityHeaders(): Record<string, string> {
    // 使用字符码构造字符串
    const quote = String.fromCharCode(39); // 单引号字符
    const self = quote + 'self' + quote;

    return {
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'default-src ' + self + '; script-src ' + self,
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer-when-downgrade',
    };
  }
}

// 创建Source Map安全实例
const sourceMapSecurity = new SourceMapSecurity();

export default sourceMapSecurity;
