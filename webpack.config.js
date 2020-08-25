const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

const defaultMode = 'development'

module.exports = {
  mode: defaultMode,
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader'
        // see .babelrc.js for configurations
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(jpg|png|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name]-[contenthash].[ext]',
          // src of img element is not resolved without `esModule: false`
          // https://github.com/vuejs/vue-loader/issues/1612#issuecomment-614542603
          esModule: false
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        loader: 'file-loader'
      }
    ]
  },
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, './assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@indexed-db': path.resolve(__dirname, './src/indexed-db'),
      '@scss': path.resolve(__dirname, './src/scss'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils')
    },
    extensions: [
      '.css',
      '.js',
      '.scss',
      '.vue'
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'images/favicon.ico',
          to: 'assets/images',
          context: path.resolve(__dirname, 'assets')
        }
      ]
    }),
    new HtmlWebpackPlugin({
      title: "Dog's Business"
    })
  ]
}
