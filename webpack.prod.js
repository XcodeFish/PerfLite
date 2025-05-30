import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import TerserPlugin from 'terser-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生产配置
export default merge(common, {
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
    clean: true,
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
            passes: 2,
            ecma: 2020,
            unsafe_arrows: true,
            unsafe_methods: true,
            toplevel: true,
            booleans_as_integers: true,
            unused: true,
          },
          mangle: {
            properties: {
              regex: /^_private_/,
            },
          },
          safari10: false,
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    splitChunks: false,
    mangleExports: 'deterministic',
    usedExports: true,
    providedExports: true,
    sideEffects: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|wasm)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg|wasm)$/,
      compressionOptions: { level: 11 },
      threshold: 8192,
      minRatio: 0.8,
    }),
  ],
  performance: {
    hints: 'warning',
    maxEntrypointSize: 200000,
    maxAssetSize: 200000,
  },
});
