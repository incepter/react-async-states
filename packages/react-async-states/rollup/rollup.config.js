const path = require('path');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');
const replace = require('@rollup/plugin-replace');
const {babel} = require('@rollup/plugin-babel');
const gzipPlugin = require('rollup-plugin-gzip');
const terser = require('@rollup/plugin-terser');
const copy = require('rollup-plugin-copy');
const del = require('rollup-plugin-delete');
const tsConfig = require("../tsconfig.json");

const libraryName = 'react-async-states';

module.exports = [
  buildLibrary({
    sourcemap: true,
    mode: "development",
    plugins: [
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript(),
      commonjs(),
    ],
  }),
  buildLibrary({
    sourcemap: false,
    mode: "production",
    plugins: [
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript(),
      commonjs(),
      gzipPlugin.default(),
      // terser(),
      copy({
        targets: [
          {
            rename: 'index.js',
            src: 'src/index-prod.js',
            dest: ['dist/es', 'dist/umd'],
          },
        ]
      }),
      copy({
        targets: [
          {
            dest: 'dist',
            src: `dist/umd/${libraryName}`,
          },
        ]
      }),
      del({
        hook: 'closeBundle',
        targets: [
          `dist/es/shared`,
          `dist/umd/shared`,
          `dist/es/${libraryName}`,
          `dist/umd/${libraryName}`,
        ]
      }),
      copy({
        hook: 'closeBundle',
        targets: [
          {
            dest: 'dist',
            src: `../../README.MD`,
          },
        ]
      }),
    ],
  }),
];

function buildLibrary({mode, sourcemap, plugins}) {
  return {
    plugins,
    input: `src/index.ts`,
    output: [
      {
        sourcemap,
        format: "umd",
        name: "ReactAsyncStates",
        file: `dist/umd/${libraryName}.${mode}.js`,
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime',
        }
      },
      {
        format: "es",
        file: `dist/es/${libraryName}.${mode}.js`,
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime',
        }
      },
    ],
    external: ['react', 'react/jsx-runtime'],
    treeshake: {
      moduleSideEffects: false,
    },
  };
}
