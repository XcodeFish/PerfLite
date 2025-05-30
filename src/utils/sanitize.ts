/**
 * 敏感数据类型
 */
export enum SensitiveDataType {
  PASSWORD = 'password',
  TOKEN = 'token',
  AUTH = 'auth',
  KEY = 'key',
  SECRET = 'secret',
  EMAIL = 'email',
  PHONE = 'phone',
  ID_CARD = 'id_card',
  CREDIT_CARD = 'credit_card',
  ADDRESS = 'address',
  IP = 'ip',
  COOKIE = 'cookie',
}

/**
 * 脱敏配置
 */
export interface ISanitizeOptions {
  /**
   * 自定义敏感数据正则表达式
   */
  patterns?: RegExp[];

  /**
   * 需要脱敏的数据类型
   */
  sensitiveTypes?: SensitiveDataType[];

  /**
   * 是否启用默认脱敏规则
   */
  useDefaultRules?: boolean;

  /**
   * 替换敏感数据的字符串
   */
  replacement?: string;

  /**
   * 是否保留部分信息
   * 例如邮箱保留前3个字符，后面替换为*
   */
  preserveLength?: boolean;

  /**
   * 保留前几个字符
   */
  preserveStart?: number;

  /**
   * 保留后几个字符
   */
  preserveEnd?: number;
}

/**
 * 默认脱敏规则
 */
const DEFAULT_PATTERNS: Record<SensitiveDataType, RegExp> = {
  [SensitiveDataType.PASSWORD]: /(password|pwd)=([^&]+)/gi,
  [SensitiveDataType.TOKEN]: /(token|access_token|auth_token|jwt)=([^&]+)/gi,
  [SensitiveDataType.AUTH]: /(authorization|auth)=([^&]+)/gi,
  [SensitiveDataType.KEY]: /(api_key|apikey|key)=([^&]+)/gi,
  [SensitiveDataType.SECRET]: /(secret|client_secret)=([^&]+)/gi,
  [SensitiveDataType.EMAIL]: /([a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi,
  [SensitiveDataType.PHONE]: /(\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/gi,
  [SensitiveDataType.ID_CARD]:
    /(\b[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X|x)\b)/gi,
  [SensitiveDataType.CREDIT_CARD]: /(\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b)/gi,
  [SensitiveDataType.ADDRESS]: null as any, // 地址格式过于复杂，需要在实际脱敏时特殊处理
  [SensitiveDataType.IP]: /(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/gi,
  [SensitiveDataType.COOKIE]: /([Cc][Oo][Oo][Kk][Ii][Ee][^;]+)/gi,
};

/**
 * 默认脱敏配置
 */
const DEFAULT_OPTIONS: ISanitizeOptions = {
  sensitiveTypes: [
    SensitiveDataType.PASSWORD,
    SensitiveDataType.TOKEN,
    SensitiveDataType.AUTH,
    SensitiveDataType.KEY,
    SensitiveDataType.SECRET,
  ],
  useDefaultRules: true,
  replacement: '[REDACTED]',
  preserveLength: false,
  preserveStart: 0,
  preserveEnd: 0,
};

/**
 * 部分保留敏感信息的特殊规则
 */
const PRESERVE_RULES: Partial<Record<SensitiveDataType, { start: number; end: number }>> = {
  [SensitiveDataType.EMAIL]: { start: 3, end: 0 },
  [SensitiveDataType.PHONE]: { start: 3, end: 4 },
  [SensitiveDataType.ID_CARD]: { start: 6, end: 4 },
  [SensitiveDataType.CREDIT_CARD]: { start: 4, end: 4 },
  [SensitiveDataType.IP]: { start: 0, end: 0 },
};

/**
 * 数据脱敏工具
 *
 * @param input 需要脱敏的字符串
 * @param options 脱敏配置
 * @returns 脱敏后的字符串
 */
export function sanitize(input: string, options: ISanitizeOptions = {}): string {
  if (!input) return input;

  // 合并配置
  const mergedOptions: ISanitizeOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    sensitiveTypes: options.sensitiveTypes || DEFAULT_OPTIONS.sensitiveTypes,
  };

  let sanitizedInput = input;

  // 应用默认规则
  if (mergedOptions.useDefaultRules) {
    for (const type of mergedOptions.sensitiveTypes!) {
      const pattern = DEFAULT_PATTERNS[type];
      if (pattern) {
        sanitizedInput = sanitizeByPattern(sanitizedInput, pattern, mergedOptions, type);
      } else if (type === SensitiveDataType.ADDRESS) {
        // 特殊处理地址信息
        sanitizedInput = sanitizeAddress(sanitizedInput, mergedOptions);
      }
    }
  }

  // 应用自定义规则
  if (mergedOptions.patterns) {
    for (const pattern of mergedOptions.patterns) {
      sanitizedInput = sanitizeByPattern(sanitizedInput, pattern, mergedOptions);
    }
  }

  return sanitizedInput;
}

/**
 * 按照正则表达式脱敏
 *
 * @param input 需要脱敏的字符串
 * @param pattern 脱敏正则表达式
 * @param options 脱敏配置
 * @param type 敏感数据类型
 * @returns 脱敏后的字符串
 */
function sanitizeByPattern(
  input: string,
  pattern: RegExp,
  options: ISanitizeOptions,
  type?: SensitiveDataType
): string {
  // 保存原始正则表达式的global状态
  const isGlobal = pattern.global;
  let result = input;

  // 如果正则表达式不是全局的，将其变为全局的
  if (!isGlobal) {
    const flags = pattern.flags.includes('i') ? 'gi' : 'g';
    pattern = new RegExp(pattern.source, flags);
  }

  // 应用正则表达式
  result = result.replace(pattern, (match, p1, p2) => {
    // 如果匹配了键值对形式的数据，只替换值部分
    if (p2) {
      return `${p1}=${getReplacement(p2, options, type)}`;
    }
    // 直接替换整个匹配
    return getReplacement(match, options, type);
  });

  return result;
}

/**
 * 获取替换字符串
 *
 * @param value 原始值
 * @param options 脱敏配置
 * @param type 敏感数据类型
 * @returns 替换后的字符串
 */
function getReplacement(
  value: string,
  options: ISanitizeOptions,
  type?: SensitiveDataType
): string {
  if (options.preserveLength) {
    // 保持原始长度，用*替换
    return '*'.repeat(value.length);
  }

  let preserveStart = options.preserveStart ?? 0;
  let preserveEnd = options.preserveEnd ?? 0;

  // 应用特定类型的保留规则
  if (type && PRESERVE_RULES[type]) {
    const rule = PRESERVE_RULES[type]!;
    preserveStart = rule.start;
    preserveEnd = rule.end;
  }

  // 如果有保留部分
  if (preserveStart > 0 || preserveEnd > 0) {
    if (value.length <= preserveStart + preserveEnd) {
      return options.replacement || DEFAULT_OPTIONS.replacement!;
    }

    const start = value.substring(0, preserveStart);
    const end = preserveEnd > 0 ? value.substring(value.length - preserveEnd) : '';
    const middle = '*'.repeat(Math.min(5, value.length - preserveStart - preserveEnd));

    return `${start}${middle}${end}`;
  }

  return options.replacement || DEFAULT_OPTIONS.replacement!;
}

/**
 * 特殊处理地址信息
 *
 * @param input 需要脱敏的字符串
 * @param options 脱敏配置
 * @returns 脱敏后的字符串
 */
function sanitizeAddress(input: string, options: ISanitizeOptions): string {
  // 简单处理：使用两个非常基本的模式来检测可能是地址的内容
  const addressPatterns = [
    // 门牌号+街道名
    /(\d{1,5}\s+[A-Za-z\s]{5,30})/gi,

    // 街道名+门牌号
    /([A-Za-z\s]{5,30}\s+\d{1,5})/gi,
  ];

  let result = input;
  for (const pattern of addressPatterns) {
    result = sanitizeByPattern(result, pattern, options, SensitiveDataType.ADDRESS);
  }

  return result;
}

/**
 * 批量脱敏多个字段
 *
 * @param data 需要脱敏的对象
 * @param fields 需要脱敏的字段
 * @param options 脱敏配置
 * @returns 脱敏后的对象
 */
export function sanitizeFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[],
  options?: ISanitizeOptions
): T {
  if (!data || typeof data !== 'object') return data;

  const result = { ...data };

  for (const field of fields) {
    if (field in data && typeof data[field] === 'string') {
      // 使用类型断言确保类型安全
      result[field] = sanitize(data[field], options) as any;
    }
  }

  return result;
}

/**
 * 深度脱敏对象中的敏感信息
 *
 * @param data 需要脱敏的对象
 * @param options 脱敏配置
 * @returns 脱敏后的对象
 */
export function sanitizeObject<T extends Record<string, any>>(
  data: T,
  options?: ISanitizeOptions
): T {
  if (!data || typeof data !== 'object') return data;

  // 如果是数组，递归处理每个元素
  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === 'object' ? sanitizeObject(item, options) : item
    ) as any;
  }

  const result = { ...data };

  // 遍历对象的每个属性
  for (const key in data) {
    // 检查属性名是否包含敏感关键字
    const lowerKey = key.toLowerCase();
    const isSensitive = (options?.sensitiveTypes || DEFAULT_OPTIONS.sensitiveTypes || []).some(
      (type) => lowerKey.includes(type.toLowerCase())
    );

    if (typeof data[key] === 'string') {
      // 如果属性名包含敏感关键字，直接脱敏整个值
      if (isSensitive) {
        (result as Record<string, any>)[key] = getReplacement(data[key], options || {});
      } else {
        // 否则应用普通脱敏规则
        (result as Record<string, any>)[key] = sanitize(data[key], options);
      }
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // 递归处理嵌套对象
      (result as Record<string, any>)[key] = sanitizeObject(data[key], options);
    }
  }

  return result;
}

/**
 * 脱敏URL
 *
 * @param url URL字符串
 * @param options 脱敏配置
 * @returns 脱敏后的URL
 */
export function sanitizeUrl(url: string, options?: ISanitizeOptions): string {
  if (!url) return url;

  try {
    // 解析URL
    const parsedUrl = new URL(url);

    // 脱敏查询参数
    for (const [key, value] of parsedUrl.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      const isSensitive = (options?.sensitiveTypes || DEFAULT_OPTIONS.sensitiveTypes || []).some(
        (type) => lowerKey.includes(type.toLowerCase())
      );

      if (isSensitive) {
        parsedUrl.searchParams.set(key, getReplacement(value, options || {}));
      }
    }

    // 脱敏认证信息
    if (parsedUrl.username || parsedUrl.password) {
      // 创建一个新的URL实例，不包含认证信息
      const protocol = parsedUrl.protocol;
      const host = parsedUrl.host;
      const pathname = parsedUrl.pathname;
      const search = parsedUrl.search;
      const hash = parsedUrl.hash;
      const sanitizedUrl = new URL(`${protocol}//${host}${pathname}${search}${hash}`);
      return sanitizedUrl.toString();
    }

    return parsedUrl.toString();
  } catch {
    // 如果URL解析失败，回退到简单的正则替换
    return sanitize(url, options);
  }
}
