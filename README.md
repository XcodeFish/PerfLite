# PerfLite

<div align="center">
  <img src="./docs/logo.png" alt="PerfLite Logo" width="200">
  <p>轻量级前端性能监控与错误分析工具</p>
  <p>
    <b>体积小</b> · <b>高性能</b> · <b>易扩展</b> · <b>智能分析</b>
  </p>
</div>

## 📖 简介

PerfLite 是一个专为前端应用设计的轻量级性能监控和错误分析工具，采用混合架构设计，集成了客户端SDK、WASM本地解析器和DeepSeek智能分析引擎。它能够帮助开发者快速定位并解决前端性能问题和错误异常，同时保持极小的体积（gzip后仅5KB）和高效的性能表现。

### 💫 亮点特性

- **超轻量**：gzip压缩后仅5KB，对应用性能几乎零影响
- **混合架构**：结合本地WASM解析和云端智能分析，兼顾性能和分析深度
- **高效解析**：使用Rust实现的WASM解析器，支持SIMD加速
- **智能分析**：集成DeepSeek-V3模型，提供深度错误分析和解决方案
- **可视化引擎**：灵活的性能指标可视化，支持WebGL高性能渲染
- **插件系统**：可扩展的插件架构，支持自定义监控需求
- **多级缓存**：LRU内存缓存与IndexedDB持久化存储结合
- **数据安全**：内置数据脱敏功能，保护用户隐私

## 🚀 安装

```bash
# 使用npm
npm install perflite

# 使用yarn
yarn add perflite

# 使用pnpm
pnpm add perflite
```

## 🏁 快速开始

### 基础用法

```javascript
import PerfLite from 'perflite';

// 初始化
const perfLite = new PerfLite({
  appId: 'your-app-id',
  // 可选：DeepSeek配置
  deepseek: {
    apiKey: 'your-api-key',
    // baseUrl: 'https://your-api-endpoint', // 可选
  },
});

// 开始监控
perfLite.start();
```

### 自定义配置

```javascript
import PerfLite from 'perflite';
import { MemoryMonitorPlugin } from 'perflite/plugins';

// 全局配置DeepSeek（可选）
import { DeepSeekClient } from 'perflite/parser/deepseek';
DeepSeekClient.configure({
  apiKey: 'your-api-key',
  quotaMode: 'economy', // 'standard' 或 'economy'
});

// 初始化带有详细配置的实例
const perfLite = new PerfLite({
  appId: 'your-app-id',
  sampling: 0.1, // 采样率10%
  maxErrors: 100, // 最多收集100个错误
  plugins: [new MemoryMonitorPlugin()],
  errorConfig: {
    ignorePatterns: [/ResizeObserver loop/, /Script error/],
  },
  performanceConfig: {
    collectResourceTiming: true,
    collectPaintTiming: true,
  },
});

// 开始监控
perfLite.start();

// 手动上报错误
try {
  // 可能出错的代码
} catch (error) {
  perfLite.reportError(error);
}

// 自定义性能标记
perfLite.mark('feature-render-start');
// ...渲染代码...
perfLite.mark('feature-render-end');
perfLite.measure('feature-render', 'feature-render-start', 'feature-render-end');
```

## 📊 可视化仪表盘

PerfLite提供了内置的可视化仪表盘，方便开发者查看性能指标和错误信息：

```javascript
// 初始化仪表盘
const dashboard = perfLite.createDashboard({
  container: '#perflite-dashboard',
  theme: 'dark', // 'light' 或 'dark'
});

// 打开仪表盘
dashboard.open();
```

## 🔌 插件系统

PerfLite支持通过插件扩展功能：

```javascript
import { createPlugin } from 'perflite/plugins';

// 创建自定义插件
const customPlugin = createPlugin({
  name: 'custom-plugin',
  setup({ core, utils }) {
    // 插件初始化逻辑
    return {
      // 插件方法和数据
    };
  },
});

// 使用插件
const perfLite = new PerfLite({
  plugins: [customPlugin],
});
```

## 🧩 项目结构

```
src/
├── core/                          # 核心监控逻辑
│   ├── ErrorParser.ts             # 错误解析器
│   ├── PerformanceAnalyzer.ts     # 性能分析器
│   ├── Visualization.ts           # 可视化引擎
│   └── APICounter.ts              # API计数器
├── parser/                        # 解析器模块
│   ├── wasm/                      # WASM本地解析器
│   └── deepseek/                  # DeepSeek智能API
├── cache/                         # 缓存系统
├── visualization/                 # 可视化引擎
├── plugins/                       # 插件系统
├── utils/                         # 工具函数
├── types/                         # 类型定义
└── index.ts                       # 入口文件

rust/                              # Rust WASM实现
tests/                             # 测试文件
examples/                          # 使用示例
```

## 🏗 架构设计

PerfLite采用分层架构设计，主要包括以下几个层次：

1. **核心层**：提供基础监控和分析功能

   - 错误捕获与解析
   - 性能指标收集与分析
   - 核心API和事件系统

2. **解析层**：处理错误和性能数据

   - 本地WASM解析器：使用Rust实现，支持SIMD加速
   - DeepSeek智能分析：提供深度错误分析和解决方案

3. **缓存层**：优化数据存取

   - 内存缓存：LRU算法实现
   - 持久化存储：IndexedDB实现

4. **可视化层**：展示性能和错误数据

   - 仪表盘系统
   - 图表适配器
   - WebGL/Canvas渲染器

5. **插件层**：扩展功能
   - 插件接口
   - 内置插件
   - 自定义插件支持

## 📘 API参考

### 核心API

```typescript
// 初始化
new PerfLite(options: PerfLiteOptions): PerfLite

// 开始监控
start(): void

// 停止监控
stop(): void

// 手动上报错误
reportError(error: Error | string): void

// 性能标记
mark(name: string): void

// 测量两个标记之间的性能
measure(name: string, startMark: string, endMark: string): void

// 创建仪表盘
createDashboard(options: DashboardOptions): Dashboard

// 添加插件
addPlugin(plugin: Plugin): void
```

### 配置选项

```typescript
interface PerfLiteOptions {
  appId: string; // 应用ID
  sampling?: number; // 采样率(0-1)
  maxErrors?: number; // 最大错误收集数
  deepseek?: {
    // DeepSeek配置
    apiKey?: string;
    baseUrl?: string;
    quotaMode?: 'standard' | 'economy';
  };
  errorConfig?: {
    // 错误配置
    ignorePatterns?: RegExp[]; // 忽略的错误模式
    captureSourceMap?: boolean; // 是否捕获sourceMap
  };
  performanceConfig?: {
    // 性能配置
    collectResourceTiming?: boolean; // 收集资源加载性能
    collectPaintTiming?: boolean; // 收集绘制性能
    collectLongTasks?: boolean; // 收集长任务
  };
  plugins?: Plugin[]; // 插件列表
}
```

## 🔧 高级使用

### 自定义错误处理

```javascript
import PerfLite from 'perflite';

const perfLite = new PerfLite({
  appId: 'your-app-id',
});

// 自定义错误处理
perfLite.onError((error, parsedError) => {
  // 自定义处理逻辑
  console.log('已捕获错误:', parsedError.message);

  // 返回false可阻止默认处理
  return false;
});

// 添加自定义上下文
perfLite.addContext({
  userId: 'user-123',
  version: '1.0.0',
});
```

### 性能分析标记

```javascript
// 开始性能分析
const traceId = perfLite.startTrace('complexOperation');

// 执行操作...
await someComplexOperation();

// 结束性能分析
perfLite.endTrace(traceId);

// 或使用自动结束的包装函数
const result = await perfLite.trace('complexOperation', async () => {
  // 执行操作...
  return await someComplexOperation();
});
```

## 🛠 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/perflite.git
cd perflite

# 安装依赖
pnpm install

# 编译WASM模块
cd rust && ./build.sh && cd ..

# 运行开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建
pnpm build
```

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 提交问题和功能请求
- 提交代码变更
- 改进文档
- 报告bug

请参阅[贡献指南](./CONTRIBUTING.md)了解更多信息。

## 📜 许可证

MIT

---

<div align="center">
  <p>由❤️打造</p>
  <p>Copyright © 2023 PerfLite Team</p>
</div>
