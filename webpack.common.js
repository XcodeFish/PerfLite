const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    perflite: './src/index.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // 处理WASM文件
      {
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'wasm/[name][ext]',
        },
      },
      // 处理wasm-bindgen生成的JS胶水代码
      {
        test: /src\/parser\/wasm\/generated\/.+\.js$/,
        type: 'javascript/auto',
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-syntax-dynamic-import']
        }
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.wasm'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    fallback: {
      'path': false,
      'fs': false,
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'PerfLite',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true,
  },
  optimization: {
    moduleIds: 'deterministic',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        wasm: {
          test: /\.wasm$/,
          type: 'asset/resource',
          chunks: 'async',
        },
      },
    },
    runtimeChunk: 'single',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(require('./package.json').version),
    }),
    // 确保WASM加载后再执行后续代码
    new webpack.NormalModuleReplacementPlugin(
      /src\/parser\/wasm\/index\.ts$/,
      resource => {
        if (resource.context.includes('node_modules')) {
          return;
        }
        resource.loaders.push({
          loader: 'string-replace-loader',
          options: {
            search: 'import {',
            replace: 'const wasmPromise = import(/* webpackMode: "eager" */ \'./generated/perflite_wasm_bg.wasm\');\nimport {',
            flags: 'g'
          }
        });
      }
    ),
  ],
}; 