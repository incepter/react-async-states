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
                 devtool,
                 outputDir,
                 externals,
                 libraryName,
                 globalObject,
                 outputFilename,
               }) {
  return {
    mode,
    entry,
    devtool,
    externals,
    watch: true,

    output: {
      globalObject,
      path: outputDir,
      library: libraryName,
      libraryTarget: target,
      filename: `${outputFilename}.${mode}.js`,
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
      new webpack.EnvironmentPlugin({NODE_ENV: mode}),
      new CircularDependencyPlugin({
        failOnError: false,
        exclude: /a\.js|node_modules/,
      }),

      new CompressionPlugin({
        test: /\.js$/,
        minRatio: 0.8,
        threshold: 10240,
        algorithm: "gzip",
      }),

      new CopyPlugin({
        patterns: [
          {
            to: path.join(currentDir, "dist/index.js"),
            from: path.join(currentDir, "src/index-prod.js")
          }
        ]
      }),
    ],

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
    devtool: "source-map",
    outputFilename: "index.js",
    externals: {react: "React"},
    libraryName: "ReactAsyncStates",
    entry: [
      "webpack-hot-middleware/client?reload=true",
      path.join(currentDir, "src/index.ts"),
    ],
  })
];
