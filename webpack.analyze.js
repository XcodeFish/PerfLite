const { merge } = require('webpack-merge');
const prod = require('./webpack.prod.js');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = merge(prod, {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      analyzerHost: '127.0.0.1',
      analyzerPort: 8888,
      reportFilename: 'report.html',
      defaultSizes: 'gzip',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'stats.json',
    }),
  ],
}); 