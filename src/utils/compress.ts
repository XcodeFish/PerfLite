/**
 * 数据压缩与传输优化工具
 * 提供高效的数据压缩、传输优化方法
 */

// 基础压缩接口
export interface ICompressionOptions {
  level?: number; // 压缩级别: 1-9，越大压缩率越高，但更耗CPU
  chunkSize?: number; // 数据分片大小，单位字节
}

// 默认配置
const DEFAULT_OPTIONS: ICompressionOptions = {
  level: 6,
  chunkSize: 1024 * 16, // 16KB
};

/**
 * 使用deflate算法压缩数据
 *
 * @param data 要压缩的字符串
 * @param options 压缩选项
 * @returns 压缩后的base64编码字符串
 */
export const compressData = async (
  data: string,
  options: ICompressionOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 如果浏览器支持CompressionStream API
  if (typeof CompressionStream !== 'undefined') {
    try {
      const blob = new Blob([data]);
      const stream = blob.stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('deflate'));
      const compressedBlob = await new Response(compressedStream).blob();
      return await blobToBase64(compressedBlob);
    } catch {
      console.warn('CompressionStream failed, falling back to pako');
      return legacyCompress(data, opts.level);
    }
  }

  // 降级方案 - 使用pako
  return legacyCompress(data, opts.level);
};

/**
 * 解压缩数据
 *
 * @param compressedData 压缩后的base64编码字符串
 * @returns 解压后的原始字符串
 */
export const decompressData = async (compressedData: string): Promise<string> => {
  // 如果浏览器支持DecompressionStream API
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const blob = base64ToBlob(compressedData);
      const stream = blob.stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));
      const responseBlob = await new Response(decompressedStream).blob();
      const text = await responseBlob.text();
      return text;
    } catch {
      console.warn('DecompressionStream failed, falling back to pako');
      return legacyDecompress(compressedData);
    }
  }

  // 降级方案 - 使用pako
  return legacyDecompress(compressedData);
};

/**
 * 分片压缩大型数据
 *
 * @param data 要压缩的大型数据字符串
 * @param options 压缩选项
 * @returns 压缩后的分片数组，每个元素为base64编码字符串
 */
export const compressLargeData = async (
  data: string,
  options: ICompressionOptions = {}
): Promise<string[]> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: string[] = [];
  const chunkSize = opts.chunkSize || (DEFAULT_OPTIONS.chunkSize as number);

  // 将数据分片
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.substring(i, i + chunkSize);
    chunks.push(await compressData(chunk, opts));
  }

  return chunks;
};

/**
 * 解压缩分片数据
 *
 * @param chunks 压缩后的分片数组，每个元素为base64编码字符串
 * @returns 解压后的完整字符串
 */
export const decompressLargeData = async (chunks: string[]): Promise<string> => {
  const results: string[] = [];
  for (const chunk of chunks) {
    results.push(await decompressData(chunk));
  }
  return results.join('');
};

/**
 * 使用传统方法压缩（依赖外部pako库，需要动态导入）
 *
 * @param data 要压缩的数据
 * @param level 压缩级别
 * @returns 压缩后的base64字符串
 */
const legacyCompress = (data: string, level: number = 6): string => {
  // 这里应该使用动态导入或确保pako已经加载
  // 为了避免直接依赖，这里提供一个接口，实际使用时需要确保pako可用

  if (typeof window !== 'undefined' && (window as any).pako) {
    const pako = (window as any).pako;
    const compressed = pako.deflate(data, { level });
    return btoa(String.fromCharCode.apply(null, Array.from(compressed)));
  }

  throw new Error('Compression library not available');
};

/**
 * 使用传统方法解压缩（依赖外部pako库，需要动态导入）
 *
 * @param base64Data 压缩后的base64字符串
 * @returns 解压后的原始数据
 */
const legacyDecompress = (base64Data: string): string => {
  if (typeof window !== 'undefined' && (window as any).pako) {
    const pako = (window as any).pako;
    const charData = atob(base64Data)
      .split('')
      .map((x) => x.charCodeAt(0));
    const data = new Uint8Array(charData);
    const decompressed = pako.inflate(data);
    return new TextDecoder().decode(decompressed);
  }

  throw new Error('Decompression library not available');
};

/**
 * Blob转Base64
 *
 * @param blob 二进制Blob对象
 * @returns Promise<string> base64编码字符串
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Base64转Blob
 *
 * @param base64 base64编码字符串
 * @returns Blob对象
 */
const base64ToBlob = (base64: string): Blob => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes]);
};

/**
 * 传输前优化数据大小
 * 合并并压缩多个数据对象
 *
 * @param dataObjects 要优化的数据对象数组
 * @returns 优化后的压缩字符串
 */
export const optimizeForTransfer = async (dataObjects: Record<string, any>[]): Promise<string> => {
  // 去除重复属性并标准化
  const optimized = deduplicate(dataObjects);
  // 转为JSON并压缩
  return await compressData(JSON.stringify(optimized));
};

/**
 * 从传输优化的数据中还原原始数据
 *
 * @param compressedData 压缩后的数据字符串
 * @returns 原始数据对象数组
 */
export const restoreFromTransfer = async (
  compressedData: string
): Promise<Record<string, any>[]> => {
  // 解压缩
  const jsonStr = await decompressData(compressedData);
  // 解析JSON
  const optimized = JSON.parse(jsonStr);
  // 还原数据
  return restoreFromOptimized(optimized);
};

/**
 * 去除数组中对象的重复属性
 *
 * @param dataObjects 数据对象数组
 * @returns 优化后的数据结构
 */
const deduplicate = (dataObjects: Record<string, any>[]): any => {
  if (!dataObjects.length) return { keys: [], values: [] };

  // 提取所有可能的键
  const allKeys = new Set<string>();
  dataObjects.forEach((obj) => {
    Object.keys(obj).forEach((key) => allKeys.add(key));
  });

  const keys = Array.from(allKeys);

  // 构建值数组
  const values = dataObjects.map((obj) => {
    return keys.map((key) => obj[key] ?? null);
  });

  return { keys, values };
};

/**
 * 从优化后的数据结构中还原原始数据
 *
 * @param optimized 优化后的数据结构
 * @returns 原始数据对象数组
 */
const restoreFromOptimized = (optimized: {
  keys: string[];
  values: any[][];
}): Record<string, any>[] => {
  const { keys, values } = optimized;

  return values.map((valueArray) => {
    const obj: Record<string, any> = {};
    keys.forEach((key, index) => {
      if (valueArray[index] !== null) {
        obj[key] = valueArray[index];
      }
    });
    return obj;
  });
};

/**
 * 压缩策略选择器
 * 根据数据特性自动选择最佳压缩方案
 *
 * @param data 要压缩的数据
 * @returns 压缩后的字符串
 */
export const smartCompress = async (data: string | Record<string, any>): Promise<string> => {
  // 对象转字符串
  const strData = typeof data === 'string' ? data : JSON.stringify(data);

  // 根据数据长度选择压缩策略
  if (strData.length < 1024) {
    // 小数据，不压缩
    return btoa(strData);
  } else if (strData.length < 100 * 1024) {
    // 中等大小，普通压缩
    return await compressData(strData);
  } else {
    // 大数据，分片压缩后合并
    const chunks = await compressLargeData(strData);
    return chunks.join('|');
  }
};

/**
 * 智能解压缩
 * 自动检测压缩方式并解压
 *
 * @param compressed 压缩后的字符串
 * @returns 解压后的数据
 */
export const smartDecompress = async (compressed: string): Promise<string> => {
  // 检查是否为分片压缩数据
  if (compressed.includes('|')) {
    const chunks = compressed.split('|');
    return await decompressLargeData(chunks);
  }

  try {
    // 尝试使用标准解压
    return await decompressData(compressed);
  } catch {
    // 可能是简单的base64编码
    try {
      return atob(compressed);
    } catch {
      // 都失败了，返回原始数据
      return compressed;
    }
  }
};
