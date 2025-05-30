import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取package.json
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  entry: {
    perflite: './src/index.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              declaration: false, // 构建时不生成声明文件
              declarationDir: undefined, // 移除declarationDir设置
              removeComments: true, // 删除注释
            },
          },
        },
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
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: '> 1%, not dead',
                    modules: false, // 保留ES模块语法以启用tree shaking
                    useBuiltIns: 'usage',
                    corejs: 3,
                  },
                ],
              ],
              plugins: [
                '@babel/plugin-syntax-dynamic-import',
                // 删除没有使用的导入
                'babel-plugin-transform-remove-imports',
              ],
            },
          },
          // 用于删除不必要的代码
          {
            loader: 'string-replace-loader',
            options: {
              search: /\/\/ @ts-(ignore|nocheck|expect-error)/g,
              replace: '',
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.wasm'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    fallback: {
      path: false,
      fs: false,
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
    pathinfo: false, // 减少文件路径信息
  },
  experiments: {
    asyncWebAssembly: true, // 异步加载WASM
    topLevelAwait: true,
  },
  optimization: {
    moduleIds: 'deterministic',
    usedExports: true, // 启用tree-shaking
    sideEffects: true, // 尊重package.json中的sideEffects标记
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(pkg.version),
    }),
  ],
};
