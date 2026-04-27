/**
 * Simplified webpack config for Electron preload script (standalone Next.js approach)
 */
const path = require('path');

const rootPath = path.join(__dirname, '.');
const srcMainPath = path.join(rootPath, 'src', 'main');
const distPath = path.join(rootPath, 'dist', 'main');

const configuration = {
  devtool: false,
  mode: 'production',
  target: 'electron-preload',
  entry: path.join(srcMainPath, 'preload.ts'),
  devtool: 'source-map',

  output: {
    path: distPath,
    filename: 'preload.js',
    library: {
      type: 'umd',
    },
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    modules: [path.join(rootPath, 'node_modules')],
  },

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },

  externals: {
    'electron': 'commonjs electron',
  },

  optimization: {
    minimize: true,
  },

  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = configuration;
