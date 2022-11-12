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

const libraryName = 'react-async-states';

const esModulesBuild = [
  {
    input: `src/index.ts`,
    output: {
      format: "esm",
      sourcemap: true,
      file: `dist/index.js`,
      globals: {
        react: 'React',
        'react/jsx-runtime': 'jsxRuntime',
      }
    },
    external: ['react', 'react/jsx-runtime'],
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript({
        tsconfigOverride: {
          exclude: [
            "node_modules",
            "src/__tests__",
            "src/index-prod.js"
          ]
        }
      }),
      commonjs(),
    ]
  }
];

const webModulesBuild = [
  {
    input: `src/index.ts`,
    output: {
      format: "esm",
      sourcemap: true,
      file: `dist/${libraryName}.development.js`,
      globals: {
        react: 'React',
        'react/jsx-runtime': 'jsxRuntime',
      }
    },
    external: ['react', 'react/jsx-runtime'],
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript({
        tsconfigOverride: {
          exclude: [
            "node_modules",
            "src/__tests__",
            "src/index-prod.js"
          ]
        }
      }),
      commonjs(),
      replace({
        preventAssignment: true,
        values: { "process.env.NODE_ENV": JSON.stringify("development") },
      }),
    ]
  },
  {
    input: `src/index.ts`,
    output: {
      format: "esm",
      sourcemap: false,
      file: `dist/${libraryName}.production.js`,
      globals: {
        react: 'React',
        'react/jsx-runtime': 'jsxRuntime',
      }
    },
    external: ['react', 'react/jsx-runtime'],
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript({
        tsconfigOverride: {
          exclude: [
            "node_modules",
            "src/__tests__",
            "src/index-prod.js"
          ]
        }
      }),
      commonjs(),
      terser(),
      replace({
        preventAssignment: true,
        values: { "process.env.NODE_ENV": JSON.stringify("production") },
      })
    ]
  }
];

const umdBuild = [
  {
    input: `src/index.ts`,
    output: [
      {
        format: "umd",
        sourcemap: true,
        name: "ReactAsyncStates",
        file: `dist/umd/${libraryName}.development.js`,
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
    plugins: [
      json(),
      resolve(),
      babel({
        babelHelpers: "bundled",
      }),
      typescript({
        tsconfigOverride: {
          exclude: [
            "node_modules",
            "src/__tests__",
            "src/index-prod.js"
          ]
        }
      }),
      commonjs(),
    ]
  },
  {
    input: `src/index.ts`,
    output: [
      {
        format: "umd",
        sourcemap: false,
        name: "ReactAsyncStates",
        file: `dist/umd/${libraryName}.production.js`,
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
    plugins: [
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript({
        tsconfigOverride: {
          exclude: [
            "node_modules",
            "src/__tests__",
            "src/index-prod.js"
          ]
        }
      }),
      commonjs(),
      gzipPlugin.default(),
      terser(),
      copy({
        targets: [
          {
            dest: 'dist/umd',
            rename: 'index.js',
            src: 'src/index-prod.js',
          },
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
      del({
        hook: 'closeBundle',
        targets: [
          `dist/umd/shared`,
          `dist/umd/${libraryName}`,
        ]
      }),
    ]
  }
];

module.exports = [
  ...esModulesBuild,
  ...webModulesBuild,
  ...umdBuild,
];
