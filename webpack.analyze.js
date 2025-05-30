import { merge } from 'webpack-merge';
import prodConfig from './webpack.prod.js';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

// 分析构建
export default merge(prodConfig, {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      analyzerPort: 8888,
      openAnalyzer: true,
    }),
  ],
});
