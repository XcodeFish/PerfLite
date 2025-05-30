import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import TerserPlugin from 'terser-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESM构建配置，保持简单
export default merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'perflite.esm.js',
    sourceMapFilename: 'perflite.esm.js.map',
    library: {
      type: 'module',
      export: 'default',
    },
    clean: false, // 不要清理dist目录，避免删除UMD构建
  },
  experiments: {
    outputModule: true, // 启用ESM输出支持
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
          },
          mangle: true,
        },
        extractComments: false,
      }),
    ],
    splitChunks: false,
  },
});
