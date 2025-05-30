# Vue性能分析插件

## 功能概述

Vue性能分析插件是PerfLite的一个核心框架适配插件，用于监控Vue应用中组件的性能表现。该插件能够：

- 自动监控Vue组件的挂载和更新性能
- 识别渲染缓慢的组件
- 跟踪组件的重渲染次数
- 提供组件间性能对比数据
- 支持Vue 2和Vue 3两个版本

## 安装

```bash
# 使用npm
npm install perflite

# 使用pnpm
pnpm add perflite
```

## 基本使用

### 在Vue应用中初始化

```javascript
// main.js
import { createApp } from 'vue';
import App from './App.vue';
import PerfLite from 'perflite';

// 初始化PerfLite，启用Vue性能分析插件
PerfLite.init({
  appId: 'your-app-id',
  plugins: {
    'vue-profiler': {
      enabled: true,
      // 可选配置项
      slowRenderThreshold: 16, // 单位ms，超过此阈值视为慢渲染
      maxProfilerEntries: 100, // 最多保存的性能记录条数
    },
  },
});

// Vue 3
createApp(App).mount('#app');

// 或Vue 2
// new Vue({
//   render: h => h(App)
// }).$mount('#app');
```

### 获取性能数据

```javascript
// 获取插件API
const vueProfilerApi = PerfLite.getPlugin('vue-profiler').getApi();

// 获取性能报告
const performanceInfo = vueProfilerApi.getVuePerformanceInfo();
console.log(performanceInfo);

// 重置性能数据
vueProfilerApi.resetProfileData();
```

## 返回的性能数据结构

```javascript
{
  // 最慢的组件（按平均渲染时间降序）
  topSlowComponents: [
    { name: 'DataTable', avgDuration: 25.4, renderCount: 12 },
    { name: 'ChartComponent', avgDuration: 18.7, renderCount: 5 },
    // ...
  ],

  // 重渲染最多的组件
  mostReRenderedComponents: [
    { name: 'MessageList', renderCount: 48 },
    { name: 'StatusIndicator', renderCount: 32 },
    // ...
  ],

  // 监控到的组件总数
  totalComponents: 24,

  // 最近的性能样本数据
  profileSamples: [
    {
      componentName: 'UserProfile',
      renderTime: 12.4,
      updateCount: 3,
      timestamp: 1626781234567,
      instanceId: 'UserProfile-1626781234567-a7b8c9',
      parentComponentName: 'App'
    },
    // ...
  ]
}
```

## 监听性能事件

```javascript
// 获取插件实例
const vueProfiler = PerfLite.getPlugin('vue-profiler');

// 监听慢渲染事件
vueProfiler.on('slowRenderDetected', (data) => {
  console.warn(`检测到慢组件：${data.component}，渲染耗时: ${data.renderTime}ms`);

  // 可以在这里触发自定义逻辑，如发送警告通知等
});
```

## 与仪表盘集成

```javascript
PerfLite.init({
  appId: 'your-app-id',
  plugins: {
    'vue-profiler': {
      enabled: true,
    },
  },
  visualization: {
    enabled: true,
    container: '#perflite-dashboard',
    theme: 'dark', // 支持light/dark主题
    chartTypes: ['bar', 'sankey', 'scatter'],
  },
});

// 在适当的时机更新仪表盘
function updateDashboard() {
  const vueProfilerApi = PerfLite.getPlugin('vue-profiler').getApi();
  const perfInfo = vueProfilerApi.getVuePerformanceInfo();

  // 触发仪表盘更新
  PerfLite.visualize({
    vuePerformance: perfInfo,
  });
}
```

## 扩展配置项

| 配置项              | 类型    | 默认值 | 描述                 |
| ------------------- | ------- | ------ | -------------------- |
| enabled             | boolean | true   | 是否启用插件         |
| slowRenderThreshold | number  | 16     | 慢渲染阈值（单位ms） |
| maxProfilerEntries  | number  | 100    | 最大保存的性能记录数 |

## 最佳实践

1. **合理设置慢渲染阈值**：默认值16ms对应屏幕刷新率60Hz下的一帧时间，对于大多数应用足够。但对于复杂应用可以适当调高，如设为25ms。

2. **识别性能瓶颈**：关注`topSlowComponents`中的组件，它们是应用中最需要优化的部分。

3. **重渲染优化**：检查`mostReRenderedComponents`中的组件，考虑使用`React.memo`、`Vue.memo`或优化数据结构减少不必要的渲染。

4. **开发环境使用**：建议在开发环境启用详细日志，生产环境可适当减少数据收集以提高性能。

5. **与其他插件结合**：与内存监控插件结合使用，可以发现内存泄漏与组件渲染的关联。

## 兼容性说明

- 完全支持Vue 2.6+和Vue 3.0+
- 自动检测Vue版本并使用对应的性能监控方法
- 对于Vue 2，推荐使用Vue 2.6+以获取完整的性能跟踪能力
