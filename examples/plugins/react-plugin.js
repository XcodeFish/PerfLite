/* eslint-env browser */
/* global window document console */
/**
 * PerfLite React插件示例
 *
 * 本示例展示如何在React项目中使用PerfLite的React性能分析插件
 */

// 引入React
import React from 'react';
import ReactDOM from 'react-dom';
// 引入应用组件
import App from './App';
// 引入PerfLite
import PerfLite from 'perflite';

// 初始化PerfLite，启用React性能分析插件
PerfLite.init({
  appId: 'react-demo',
  plugins: {
    'react-profiler': {
      enabled: true,
      slowRenderThreshold: 10, // 10ms以上视为慢渲染
      maxProfilerEntries: 200, // 最多保存200条记录
    },
  },
  // 开启仪表盘
  visualization: {
    enabled: true,
    theme: 'light',
    container: '#perflite-dashboard', // 仪表盘挂载点
    chartTypes: ['bar', 'sankey'], // 使用的图表类型
  },
  // 配置脱敏规则，防止敏感信息被收集
  dataSanitizer: {
    enabled: true,
    rules: ['password', 'token', 'auth'],
  },
});

// 创建一个性能分析包装组件
function withPerfMonitor(Component, id) {
  // 获取React分析器API
  const reactProfilerApi = PerfLite.getPlugin('react-profiler').getApi();

  return function WrappedWithPerfMonitor(props) {
    // 使用React的Profiler组件进行性能分析
    return reactProfilerApi.createProfilerWrapper(
      id || Component.displayName || Component.name,
      <Component {...props} />
    );
  };
}

// 包装一个需要性能监控的组件
const MonitoredApp = withPerfMonitor(App, 'MainApp');

// 挂载React应用
ReactDOM.render(<MonitoredApp />, document.getElementById('root'));

// 注册性能报告生成函数
window.generatePerfReport = () => {
  const reactProfilerApi = PerfLite.getPlugin('react-profiler').getApi();
  const perfInfo = reactProfilerApi.getReactPerformanceInfo();
  console.log('React性能分析报告:', perfInfo);

  // 查看最慢的组件
  console.log('最慢的组件:', perfInfo.topSlowComponents);

  // 查看重渲染最多的组件
  console.log('重渲染最多的组件:', perfInfo.mostReRenderedComponents);

  return perfInfo;
};
