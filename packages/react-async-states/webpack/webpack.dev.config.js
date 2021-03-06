const path = require("path");
const webpack = require("webpack");
const CircularDependencyPlugin = require("circular-dependency-plugin");

module.exports = require("./webpack.base.config")({
  mode: "development",

  // Add hot reloading in development
  entry: [
    "webpack-hot-middleware/client?reload=true",
    path.join(process.cwd(), "src/index.ts"),
  ],

  // Don't use hashes in dev mode for better performance
  output: {
    filename: "index.js"
  },

  // Add development plugins
  plugins: [
    // new ErrorOverlayPlugin(),
    new webpack.HotModuleReplacementPlugin(), // Tell webpack we want hot reloading
    new CircularDependencyPlugin({
      exclude: /a\.js|node_modules/, // exclude node_modules
      failOnError: false, // show a warning when there is a circular dependency
    })
  ],

  devtool: "source-map",

  performance: {
    hints: false,
  },

  watch: true
});
