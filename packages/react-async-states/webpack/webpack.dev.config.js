const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");

let currentDir = process.cwd();

function build({
                 mode,
                 entry,
                 target,
                 outputDir,
                 externals,
                 libraryName,
                 globalObject,
                 outputFilename,
               }) {
  return {
    mode,
    entry,
    externals,
    watch: true,
    devtool: "source-map",

    performance: {
      hints: false,
    },

    output: {
      globalObject,
      path: outputDir,
      library: libraryName,
      libraryTarget: target,
      filename: outputFilename,
    },

    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
          },
        },
        {
          enforce: "pre",
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "source-map-loader"
        }
      ],
    },

    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.EnvironmentPlugin({
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      }),
      new CircularDependencyPlugin({
        failOnError: false,
        exclude: /a\.js|node_modules/,
      }),
    ],

    resolve: {
      modules: ["node_modules", "src"],
      extensions: [".js", ".ts", ".tsx"]
    },
  }
}

module.exports = [
  build({
    target: "umd",
    mode: "development",
    globalObject: "this",
    outputFilename: "index.js",
    externals: {react: "react"},
    libraryName: "ReactAsyncStates",
    outputDir: path.join(currentDir, "dist"),
    entry: [
      "webpack-hot-middleware/client?reload=true",
      path.join(currentDir, "src/index.ts"),
    ],
  })
];
