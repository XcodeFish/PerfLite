/**
 * 工具函数入口
 */

/**
 * 计算字符串的MD5哈希值
 * 这是一个简化版的MD5实现，生产环境可以使用成熟的库
 */
export function md5(input: string): string {
  // 简单的哈希函数实现
  let hash = 0;
  if (input.length === 0) return hash.toString(16);

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }

  return Math.abs(hash).toString(16);
}

/**
 * 数据脱敏工具
 * 将敏感信息替换为[REDACTED]
 */
export function sanitize(data: string): string {
  if (!data) return data;

  // 替换常见的敏感信息模式
  return data
    .replace(/(password|token|secret|key)=([^&]+)/gi, '$1=[REDACTED]')
    .replace(/(Authorization: Bearer\s+)([A-Za-z0-9._~+/-]+=*)/gi, '$1[REDACTED]')
    .replace(/([A-Za-z0-9._-]+@[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+)/gi, '[EMAIL]');
}

/**
 * 压缩工具
 * 简单的字符串压缩
 */
export function compress(data: string): string {
  if (!data) return data;

  // 极简压缩：替换常见模式
  return data
    .replace(/\s+/g, ' ')
    .replace(/([{,:])\s+/g, '$1')
    .replace(/\s+([},:])/g, '$1');
}

/**
 * 浏览器兼容工具
 */
export const browser = {
  /**
   * 检测当前浏览器是否支持特定功能
   */
  supports: {
    indexedDB: (): boolean => typeof window !== 'undefined' && !!window.indexedDB,
    webAssembly: (): boolean => typeof WebAssembly !== 'undefined',
    simd: async (): Promise<boolean> => {
      if (!browser.supports.webAssembly()) return false;

      try {
        // 尝试编译一个使用SIMD的WASM模块
        const bytes = new Uint8Array([
          0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 7, 10, 1, 6, 115, 105,
          109, 100, 79, 112, 0, 0, 10, 8, 1, 6, 0, 65, 0, 253, 15, 11,
        ]);

        const module = await WebAssembly.compile(bytes);
        return WebAssembly.Module.exports(module).some((exp) => exp.name === 'simdOp');
      } catch {
        return false;
      }
    },

    /**
     * 检测当前浏览器是否支持SharedArrayBuffer
     */
    sharedArrayBuffer: (): boolean => typeof SharedArrayBuffer !== 'undefined',

    /**
     * 检测当前浏览器是否支持Performance API
     */
    performanceAPI: (): boolean => typeof performance !== 'undefined',
  },

  /**
   * 获取浏览器和操作系统信息
   */
  getInfo: (): { name: string; version: string; os: string } => {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let version = 'Unknown';
    let os = 'Unknown';

    // 提取浏览器信息
    if (ua.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      const match = ua.match(/Chrome\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      const match = ua.match(/Firefox\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (ua.indexOf('Safari') > -1) {
      browserName = 'Safari';
      const match = ua.match(/Version\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
      browserName = 'Internet Explorer';
      const match = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/);
      if (match) version = match[1];
    }

    // 提取操作系统信息
    if (ua.indexOf('Windows') > -1) {
      os = 'Windows';
    } else if (ua.indexOf('Mac') > -1) {
      os = 'MacOS';
    } else if (ua.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (ua.indexOf('Android') > -1) {
      os = 'Android';
    } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
      os = 'iOS';
    }

    return { name: browserName, version, os };
  },
};
