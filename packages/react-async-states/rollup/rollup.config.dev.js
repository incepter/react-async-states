const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');
const {babel} = require('@rollup/plugin-babel');
const copy = require('rollup-plugin-copy');

const libraryName = 'react-async-states';

module.exports = {
  input: `src/index.ts`,
  output: [
    {
      format: 'umd',
      sourcemap: true,
      file: `dist/umd/index.js`,
      name: "ReactAsyncStates",
      globals: {
        react: 'React',
        'react/jsx-runtime': 'jsxRuntime',
      }
    },
    {
      format: 'es',
      sourcemap: true,
      file: `dist/es/index.js`,
      name: "ReactAsyncStates",
      globals: {
        react: 'React',
        'react/jsx-runtime': 'jsxRuntime',
      }
    },
  ],
  external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  watch: {
    include: 'src/**',
  },
  plugins: [
    babel({babelHelpers: 'bundled'}),
    json(),
    resolve(),
    commonjs(),
    typescript(),

    copy({
      hook: 'closeBundle',
      targets: [
        {
          dest: 'dist',
          src: `dist/umd/${libraryName}`,
        },
      ]
    })
  ],
};
