const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');
const dts = require('rollup-plugin-dts').default;
const {babel} = require('@rollup/plugin-babel');

const devBuild = {
  input: `src/index.ts`,
  globals: {
    react: 'React',
    'react/jsx-runtime': 'jsxRuntime',
    'async-states': 'AsyncStates',
    'react-async-states': 'ReactAsyncStates',
  },
  output: [
    {
      format: 'es',
      dir: "dist/es",
      sourcemap: true,
      preserveModules: true,
      // file: `dist/index.js`,
      name: "ReactAsyncStatesUtils",
      globals: {
        react: 'React',
        'react/jsx-runtime': 'jsxRuntime',
        'async-states': 'AsyncStates',
        'react-async-states': 'ReactAsyncStates',
      }
    },
  ],
  external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-async-states', 'async-states'],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // babel({babelHelpers: 'bundled'}),
    json(),
    resolve(),
    commonjs(),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: false,
        },
        exclude: [
          "node_modules",
          "src/__tests__",
          "src/index-prod.js"
        ]
      }
    }),
    // dts(),
  ],
};

const declarationsBuild = {
  input: `src/index.ts`,
  output: [
    {
      dir: "dist/es",
      sourcemap: false,
      preserveModules: true,
      name: "ReactAsyncStatesUtils",
    },
  ],
  watch: {
    include: 'src/**',
  },
  plugins: [dts()],
};

module.exports = [
  devBuild,
  declarationsBuild,
];
