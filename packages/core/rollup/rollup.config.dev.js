const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');
const {babel} = require('@rollup/plugin-babel');

const devBuild = {
  input: `src/index.ts`,
  globals: {
    react: 'React',
    'react/jsx-runtime': 'jsxRuntime',
  },
  output: [
    {
      dir: "dist",
      format: 'es',
      sourcemap: true,
      name: "AsyncStates",
      preserveModules: true,
    },
  ],
  watch: {
    include: 'src/**',
  },
  plugins: [
    babel({babelHelpers: 'bundled'}),
    json(),
    resolve(),
    commonjs(),
    typescript({
      tsconfigOverride: {
        exclude: [
          "node_modules",
        ]
      }
    }),
  ],
};

module.exports = [
  devBuild,
];
