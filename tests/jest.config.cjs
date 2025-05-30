/**
 * Jest 测试配置文件
 * 配置测试环境、覆盖率和报告生成
 */
module.exports = {
  // 使用 ts-jest 预设，支持 TypeScript 测试
  preset: 'ts-jest',
  // 使用 jsdom 环境模拟浏览器
  testEnvironment: 'jsdom',
  // 测试文件目录
  roots: ['<rootDir>/../tests'],
  // 启用覆盖率收集
  collectCoverage: true,
  // 指定需要收集覆盖率的文件
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts', '!src/types/**/*.ts'],
  // 设置覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],
  // 测试环境设置文件
  setupFilesAfterEnv: ['<rootDir>/../tests/setup.ts'],
  // 测试超时时间（毫秒）
  testTimeout: 10000,
  // 测试报告生成器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
      },
    ],
    // 暂时禁用自定义报告器，直到创建
    // ['./tests/reporters/custom-reporter.js'],
  ],
};
