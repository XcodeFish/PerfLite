const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  output: {
    filename: 'perflite.js',
    sourceMapFilename: 'perflite.js.map',
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'examples/basic'),
    },
    hot: true,
    port: 9000,
    open: true,
    client: {
      overlay: true,
    },
  },
  stats: {
    colors: true,
    modules: true,
    reasons: true,
    errorDetails: true,
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  watchOptions: {
    ignored: /node_modules/,
  },
}); 