const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("rollup-plugin-typescript2");
const json = require("@rollup/plugin-json");
const dts = require("rollup-plugin-dts").default;
const { babel } = require("@rollup/plugin-babel");

const devBuild = {
  input: `src/index.ts`,
  output: [
    {
      format: "es",
      dir: "dist/es",
      sourcemap: true,
      preserveModules: true,
      // file: `dist/index.js`,
      name: "AsyncStates",
    },
  ],
  watch: {
    include: "src/**",
  },
  plugins: [
    json(),
    babel({ babelHelpers: "bundled" }),
    resolve(),
    commonjs(),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: false,
        },
        exclude: ["node_modules", "src/__tests__", "src/index-prod.js"],
      },
    }),
  ],
};

const declarationsBuild = {
  input: `src/index.ts`,
  output: [
    {
      format: "es",
      dir: "dist/es",
      sourcemap: false,
      preserveModules: true,
      name: "AsyncStates",
    },
  ],
  watch: {
    include: "src/**",
  },
  plugins: [
    json(),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          sourceMap: false,
          declaration: false,
          declarationMap: false,
        },
        exclude: ["node_modules", "src/__tests__", "src/index-prod.js"],
      },
    }),
    dts(),
  ],
};

module.exports = [devBuild, declarationsBuild];
