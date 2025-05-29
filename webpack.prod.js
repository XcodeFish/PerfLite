const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const path = require('path');

// 生产配置
module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'perflite.min.js',
    sourceMapFilename: 'perflite.min.js.map',
    library: {
      type: 'umd',
      name: 'PerfLite',
    },
    globalObject: 'this',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info'],
          },
          mangle: true,
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    usedExports: true, // Tree Shaking
    sideEffects: true,
    concatenateModules: true,
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|wasm)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ],
  performance: {
    hints: 'warning',
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
  },
});
