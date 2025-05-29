import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
    files: ['webpack.*.js', 'commitlint.config.js', '.eslintrc.js'],
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
      '@typescript-eslint/no-explicit-any': 'warn', // 将any警告降级为警告而非错误
    },
  },
];
