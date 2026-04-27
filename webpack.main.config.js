/**
 * Simplified webpack config for Electron main process (standalone Next.js approach)
 */
const path = require('path');
const webpack = require('webpack');

const rootPath = path.join(__dirname, '.');
const srcMainPath = path.join(rootPath, 'src', 'main');
const distPath = path.join(rootPath, 'dist', 'main');

const configuration = {
  devtool: false,
  mode: 'production',
  target: 'electron-main',
  entry: path.join(srcMainPath, 'main.ts'),
  devtool: 'source-map',

  output: {
    path: distPath,
    filename: 'main.js',
    library: {
      type: 'commonjs2',
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

  // Option A: Full External approach for native modules
  externals: [
    'electron',
    'drizzle-orm',
    /^@libsql\/.*/,
    /^libsql$/,
  ],

  optimization: {
    minimize: true,
  },

  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = configuration;
