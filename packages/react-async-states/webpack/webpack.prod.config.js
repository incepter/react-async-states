const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

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
      filename: outputFilename,
    },

    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          loader: "ts-loader",
        },
      ],
    },

    plugins: [

      new CompressionPlugin({
        test: /\.js$/,
        minRatio: 0.8,
        threshold: 10240,
        algorithm: "gzip",
      }),

      new webpack.EnvironmentPlugin({NODE_ENV: mode}),

      new CopyPlugin({
        patterns: [
          {
            to: path.join(process.cwd(), "dist/index.js"),
            from: path.join(process.cwd(), "src/index-prod.js")
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
      sideEffects: true,
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
    externals: {react: "react"},
    libraryName: "ReactAsyncStates",
    outputDir: path.resolve(process.cwd(), "dist"),
    outputFilename: `react-async-states.${mode}.js`,
    entry: path.resolve(process.cwd(), "src/index.ts"),
  });
}

module.exports = [
  defaultUmdBuild("production"),
  defaultUmdBuild("development"),
];
