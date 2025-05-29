# PerfLite

轻量级前端性能监控SDK，体积仅5KB（gzip后）。

## 特点

- 轻量级：总体积控制在5KB以内（gzip后）
- 高性能：使用WASM本地解析+LRU缓存，处理10万次/分钟无压力
- 智能化：集成DeepSeek-V3社区版智能分析错误
- 可视化：内置WebGL/Canvas双引擎渲染

## 混合架构设计

PerfLite采用三层混合架构：

1. **客户端SDK**：轻量级TS核心库
2. **WASM本地解析器**：高性能Rust实现的错误解析
3. **DeepSeek-V3社区版**：复杂错误智能分析

## 快速开始

### 安装

```bash
pnpm add perflite
```

### 基本用法

```javascript
import { PerfLite } from 'perflite';

// 初始化SDK
const perfLite = new PerfLite({
  appId: 'your-app-id',
  enableErrorTracking: true,
  enablePerformanceMonitoring: true
});

// 手动上报错误
try {
  // 某些可能出错的代码
} catch (error) {
  perfLite.reportError(error);
}
```

## 开发指南

### 环境要求

- Node.js 18+
- Rust 1.70+
- wasm-bindgen-cli

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
# 构建WASM模块
pnpm build:wasm

# 构建JavaScript SDK
pnpm build

# 一次性构建所有
pnpm build:all
```

### 开发

```bash
pnpm dev
```

### 测试

```bash
pnpm test
```

## 解决ESLint/Prettier配置问题

如果遇到lint-staged和husky预提交钩子的问题，可以尝试以下步骤：

1. 更新ESLint配置为新版本格式：

   ```js
   // eslint.config.js
   import js from '@eslint/js';
   import tseslint from 'typescript-eslint';

   export default [
     js.configs.recommended,
     ...tseslint.configs.recommended,
     // 其他配置...
   ];
   ```

2. 确保package.json中有正确的type字段：

   ```json
   {
     "type": "module"
   }
   ```

3. 安装正确的依赖：

   ```bash
   pnpm add -D @eslint/js typescript-eslint eslint-config-prettier
   ```

4. 配置.lintstagedrc：

   ```json
   {
     "*.{js,ts}": ["eslint --fix", "prettier --write"],
     "*.{json,md}": ["prettier --write"]
   }
   ```

## 项目结构

PerfLite遵循严格的模块化设计，详细项目结构请参考[代码规范](docs/代码规范.md)。

## 许可证

MIT
