const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

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
      ],
    },

    plugins: [
      new webpack.EnvironmentPlugin({NODE_ENV: mode}),

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

function defaultUmdBuild(mode) {
  return build({
    mode,
    target: "umd",
    globalObject: "this",
    externals: {react: "React"},
    libraryName: "ReactAsyncStates",
    outputFilename: "react-async-states",
    outputDir: path.resolve(currentDir, "dist"),
    entry: path.resolve(currentDir, "src/index.ts"),
  });
}

module.exports = [
  defaultUmdBuild("production"),
  defaultUmdBuild("development"),
];
