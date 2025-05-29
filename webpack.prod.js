const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const path = require('path');

// 基本生产配置
const prodConfig = {
  mode: 'production',
  devtool: 'source-map',
  output: {
    filename: 'perflite.min.js',
    sourceMapFilename: 'perflite.min.js.map',
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
};

// ESM构建配置
const esmConfig = merge({}, common, {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'perflite.esm.js',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
});

// 默认导出UMD构建
module.exports = merge(common, prodConfig);

// 导出配置数组，支持多种格式输出
module.exports = [
  merge(common, prodConfig), // UMD
  merge(esmConfig, prodConfig, {
    output: {
      filename: 'perflite.esm.js',
      library: {
        type: 'module',
      },
    },
  }), // ESM
]; 