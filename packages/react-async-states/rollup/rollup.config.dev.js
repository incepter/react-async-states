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
      dir: "dist/es",
      sourcemap: true,
      preserveModules: true,
      // file: `dist/index.js`,
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
    typescript({
      tsconfigOverride: {
        exclude: [
          "node_modules",
          "src/__tests__",
          "src/index-prod.js"
        ]
      }
    }),
  ],
};

module.exports = [
  devBuild,
];
