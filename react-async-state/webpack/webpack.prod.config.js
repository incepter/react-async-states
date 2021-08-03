// Important modules this config uses
const path = require("path");
// const OfflinePlugin = require("offline-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = require("./webpack.base.config")({
  mode: "production",

  // In production, we skip all hot-reloading stuff
  entry: path.join(process.cwd(), "src/index.js"),

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: {
    filename: "index.js"
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          warnings: false,
          compress: {
            comparisons: false,
          },
          parse: {},
          mangle: true,
          output: {
            comments: false,
            ascii_only: true,
          },
        }
      }),
    ],
    nodeEnv: "production",
    sideEffects: true,
    concatenateModules: true
  },

  plugins: [

    new CompressionPlugin({
      algorithm: "gzip",
      test: /\.js$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    // new BundleAnalyzerPlugin(),
  ]
});
