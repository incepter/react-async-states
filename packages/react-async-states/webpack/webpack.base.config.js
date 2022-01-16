const path = require("path");
const webpack = require("webpack");

function makeConfigFromOutput(options, output) {
  return {
    output,
    mode: options.mode,
    entry: options.entry,
    optimization: options.optimization,
    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
          },
        },
        { enforce: "pre", test: /\.js$/, exclude: /node_modules/, loader: "source-map-loader" }
      ],
    },
    plugins: options.plugins.concat([
      // Always expose NODE_ENV to webpack, in order to use `process.env.NODE_ENV`
      // inside your code for any environment checks; Terser will automatically
      // drop any unreachable code.
      new webpack.EnvironmentPlugin({
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      }),
    ]),
    resolve: {
      modules: ["node_modules", "src"],
      extensions: [".js", ".ts", ".tsx"]
    },
    devtool: options.devtool,
    performance: options.performance || {},
    externals: {
      react: "react"
    }
  };
}

function makeOutputFor(type, outputPath = `dist/${type}`) {
  return function makeFromType(options) {
    return {
      path: path.resolve(process.cwd(), outputPath),
      ...options.output,
      libraryTarget: type,
      library: "ReactAsyncState"
    };
  }
}


const umdOutput = makeOutputFor("umd", "dist");

module.exports = options => [
  makeConfigFromOutput(options, umdOutput(options))
];
