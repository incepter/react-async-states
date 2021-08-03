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
          test: /\.js?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
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
      extensions: [".js"]
    },
    devtool: options.devtool,
    performance: options.performance || {},
    externals: {
      react: "react"
    }
  };
}

function makeOutputFor(type) {
  return function makeFromType(options) {
    return {
      clean: true,
      path: path.resolve(process.cwd(), `dist/${type}`),
      ...options.output,
      library: {
        type,
        name: "ReactAsyncState",
      }
    };
  }
}


const umdOutput = makeOutputFor("umd");
const commonJsOutput = makeOutputFor("commonjs");

module.exports = options => [
  makeConfigFromOutput(options, umdOutput(options)),
  makeConfigFromOutput(options, commonJsOutput(options))
];
