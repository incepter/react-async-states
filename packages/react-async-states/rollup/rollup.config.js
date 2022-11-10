const path = require('path');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const sourceMaps = require('rollup-plugin-sourcemaps');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');
const replace = require('@rollup/plugin-replace');
const {babel} = require('@rollup/plugin-babel');
const gzipPlugin = require('rollup-plugin-gzip');
const terser = require('@rollup/plugin-terser');
const copy = require('rollup-plugin-copy');
const tsConfig = require("../tsconfig.json");

const libraryName = 'react-async-states';

module.exports = [
  buildLibrary({
    sourcemap: true,
    mode: "development",
    plugins: [
      json(),
      resolve(),
      typescript(),
      commonjs(),
      babel({babelHelpers: 'bundled'}),
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
      typescript(),
      commonjs(),
      gzipPlugin.default(),
      babel({babelHelpers: 'bundled'}),
      terser(),
      copy({
        targets: [
          {
            dest: path.join(process.cwd(), "dist/umd/index.js"),
            src: path.join(process.cwd(), "src/index-prod.js")
          },
        ]
      })
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
