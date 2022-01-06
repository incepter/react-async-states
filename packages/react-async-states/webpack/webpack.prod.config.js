const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

function buildFor(entry, output, mode) {
  return {
    mode,
    entry,
    output,

    module: {
      rules: [
        {
          test: /\.js?$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
          },
        },
      ],
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
      nodeEnv: mode,
      usedExports: true,
      sideEffects: false,
      concatenateModules: true
    },

    plugins: [

      new CompressionPlugin({
        algorithm: "gzip",
        test: /\.js$/,
        threshold: 10240,
        minRatio: 0.8,
      }),
      new webpack.EnvironmentPlugin({
        NODE_ENV: mode,
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.join(process.cwd(), "src/index-prod.js"),
            to: path.join(process.cwd(), "dist/index.js")
          }
        ]
      }),
    ],
    resolve: {
      modules: ["node_modules", "src"],
      extensions: [".js"]
    },
    externals: {
      react: "react"
    }
  };
}

function umdBuild() {
  return buildFor(
    path.join(process.cwd(), "src/index.js"),
    {
      libraryTarget: "umd",
      library: "ReactAsyncState",
      path: path.resolve(process.cwd(), `dist`),
      filename: "react-async-states.production.js",
    },
    "production"
  );
}

function devBuild() {

  return buildFor(
    path.join(process.cwd(), "src/index.js"),
    {
      libraryTarget: "umd",
      library: "ReactAsyncState",
      path: path.resolve(process.cwd(), `dist`),
      filename: "react-async-states.development.js",
    },
    "development"
  );
}

module.exports = [
  devBuild(),
  umdBuild(),
];
