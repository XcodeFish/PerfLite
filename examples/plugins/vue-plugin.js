/* eslint-env browser */
/* global setTimeout console */
/**
 * PerfLite Vue插件示例
 *
 * 本示例展示如何在Vue项目中使用PerfLite的Vue性能分析插件
 */

// 引入Vue
import Vue from 'vue';
// 引入Vue应用
import App from './App.vue';
// 引入PerfLite
import PerfLite from 'perflite';

// 初始化PerfLite，启用Vue性能分析插件
PerfLite.init({
  appId: 'vue-demo',
  plugins: {
    'vue-profiler': {
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

// 获取Vue性能分析的API
const vueProfilerApi = PerfLite.getPlugin('vue-profiler').getApi();

// 创建Vue应用
new Vue({
  render: (h) => h(App),
  mounted() {
    // 示例：获取并在控制台输出Vue性能信息
    setTimeout(() => {
      const perfInfo = vueProfilerApi.getVuePerformanceInfo();
      console.log('Vue性能分析报告:', perfInfo);

      // 查看最慢的组件
      console.log('最慢的组件:', perfInfo.topSlowComponents);

      // 查看重渲染最多的组件
      console.log('重渲染最多的组件:', perfInfo.mostReRenderedComponents);
    }, 5000); // 5秒后获取性能数据
  },
}).$mount('#app');
