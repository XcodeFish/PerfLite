import { ErrorParser } from '../../src/core/ErrorParser';
import { parser as parserFactory } from '../../src/parser';

// 模拟解析器工厂
jest.mock('../../src/parser', () => ({
  parser: {
    parseStack: jest.fn(),
    configureDeepSeek: jest.fn(),
    setComplexStackThreshold: jest.fn(),
  },
}));

describe('错误处理集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应使用解析器工厂解析错误栈', async () => {
    const mockFrames = [
      {
        functionName: 'testFunction',
        fileName: 'test.js',
        lineNumber: 10,
        columnNumber: 5,
      },
    ];

    // 模拟解析器工厂返回结果
    (parserFactory.parseStack as jest.Mock).mockResolvedValue(mockFrames);

    const errorParser = new ErrorParser();
    const error = new Error('测试错误');
    error.stack = 'Error: 测试错误\n    at testFunction (test.js:10:5)';

    const parsedError = await errorParser.parse(error);

    // 验证调用了解析器工厂
    expect(parserFactory.parseStack).toHaveBeenCalledWith(error.stack);

    // 验证解析结果
    expect(parsedError).toEqual(
      expect.objectContaining({
        message: '测试错误',
        name: 'Error',
        stack: error.stack,
        type: 'unknown',
        parsedStack: mockFrames,
        frames: mockFrames,
        source: 'local',
      })
    );
  });

  test('解析器工厂失败时应降级到基础解析', async () => {
    // 模拟解析器工厂抛出异常
    (parserFactory.parseStack as jest.Mock).mockRejectedValue(new Error('解析失败'));

    const errorParser = new ErrorParser();
    const errorStack = 'Error: 测试错误\n    at testFunction (test.js:10:5)';

    const parsedError = await errorParser.parse(errorStack);

    // 验证调用了解析器工厂
    expect(parserFactory.parseStack).toHaveBeenCalledWith(errorStack);

    // 验证返回了基本解析结果 - 使用部分匹配而非严格匹配
    expect(parsedError).toMatchObject({
      name: 'Error',
      stack: errorStack,
      type: 'unknown',
      source: 'fallback',
    });

    // 验证基本解析结果包含正确的栈帧
    expect(parsedError.frames).toHaveLength(1);
    expect(parsedError.frames[0]).toEqual(
      expect.objectContaining({
        functionName: 'testFunction',
        fileName: 'test.js',
        lineNumber: 10,
        columnNumber: 5,
      })
    );
  });

  test('复杂栈应将source标记为deepseek', async () => {
    // 创建复杂栈帧数组（超过阈值）
    const complexFrames = Array(6)
      .fill(0)
      .map((_, i) => ({
        functionName: `function${i}`,
        fileName: `file${i}.js`,
        lineNumber: i + 1,
        columnNumber: 10,
      }));

    // 模拟解析器工厂返回复杂栈帧
    (parserFactory.parseStack as jest.Mock).mockResolvedValue(complexFrames);

    const errorParser = new ErrorParser({ complexStackThreshold: 5 });
    const error = new Error('复杂错误');
    error.stack =
      'Error: 复杂错误\n' +
      complexFrames
        .map((f) => `    at ${f.functionName} (${f.fileName}:${f.lineNumber}:${f.columnNumber})`)
        .join('\n');

    const parsedError = await errorParser.parse(error);

    // 验证source应该是deepseek（因为栈帧数超过阈值）
    expect(parsedError.source).toBe('deepseek');
  });

  test('解析错误时应支持数据脱敏', async () => {
    // 模拟解析器工厂返回结果
    (parserFactory.parseStack as jest.Mock).mockImplementation((stack) => {
      // 使用栈变量避免TS未使用警告
      console.log(`测试脱敏栈: ${stack.includes('[REDACTED]') ? '已脱敏' : '未脱敏'}`);

      return Promise.resolve([
        {
          functionName: 'testFunction',
          fileName: 'test.js',
          lineNumber: 10,
          columnNumber: 5,
        },
      ]);
    });

    const errorParser = new ErrorParser();
    const sensitiveStack =
      'Error: 请求失败 token=secret123&password=123456\n    at testFunction (test.js:10:5)';

    // 使用启用了脱敏的选项
    const parsedError = await errorParser.parse(sensitiveStack, { sanitize: true });

    // 验证调用了解析器工厂，并且传入的是已脱敏的栈
    expect(parserFactory.parseStack).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));

    // 验证返回的栈已被脱敏
    expect(parsedError.stack).toContain('[REDACTED]');
    expect(parsedError.stack).not.toContain('secret123');
    expect(parsedError.stack).not.toContain('123456');
  });
});
