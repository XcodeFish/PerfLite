import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 全局忽略规则
    ignores: ['**/wasm/generated/**', 'dist/**', 'node_modules/**', 'src/parser/wasm/generated/**'],
  },
  {
    files: ['**/*.{js,ts}'],
    rules: {
      // 自定义规则
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      indent: ['error', 2],
      'max-len': ['error', { code: 100 }],
    },
  },
  // 为webpack配置文件和其他CommonJS模块添加特殊规则
  {
    files: [
      'webpack.*.js',
      'commitlint.config.js',
      'commitlint.config.cjs',
      '.eslintrc.js',
      'tests/.eslintrc.js',
      'tests/.eslintrc.cjs',
      'tests/jest.config.cjs',
      '**/*.cjs',
    ],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'max-len': ['error', { code: 130 }],
    },
  },
  // TypeScript文件规则
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // 将any类型检查降级为警告而不是错误
    },
  },
  // 测试文件可以更宽松
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // 测试文件中允许使用any
      'max-len': ['error', { code: 120 }], // 测试文件可以有更长的行
    },
  },
  // 测试报告文件
  {
    files: ['tests/generate-report.js'],
    rules: {
      indent: 'off', // 忽略缩进问题
    },
  },
];
