const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const {BundleAnalyzerPlugin} = require("webpack-bundle-analyzer");

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
            loader: "babel-loader",
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
      usedExports: true,
      sideEffects: false,
      nodeEnv: "production",
      concatenateModules: true
    },

    plugins: [

      new CompressionPlugin({
        algorithm: "gzip",
        test: /\.js$/,
        threshold: 10240,
        minRatio: 0.8,
      }),
      new BundleAnalyzerPlugin({
        openAnalyzer: false,
        analyzerMode: "static",
        reportFilename: "report.html"
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
  umdBuild(),
  devBuild(),
];
