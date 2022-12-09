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
      preserveModules: true,
      dir: 'dist/es',
      // file: `dist/index.js`,
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
      // terser({
      //   compress: {
      //     keep_fargs: true,
      //     keep_fnames: true,
      //     reduce_funcs: false,
      //   },
      //   mangle: {
      //     keep_fnames: true,
      //
      //   },
      // }),
      // babel({babelHelpers: 'bundled'}),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            target: 'ESNEXT',
            declaration: true,
          },
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
      commonjs(),
      gzipPlugin.default(),
      terser({
        compress: {
          reduce_funcs: false,
        }
      }),
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
    ]
  }
];

const devtoolsSharedBuild = [
  {
    input: `src/devtools/index.ts`,
    output: [
      {
        format: "esm",
        sourcemap: true,
        file: 'dist/devtools/index.js',
      },
    ],
    plugins: [
      json(),
      resolve(),
      babel({babelHelpers: 'bundled'}),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
          },
          include: [
            "src/devtools/index.ts",
          ],
          exclude: [
            "node_modules",
          ]
        }
      }),
      commonjs(),
      terser({
        compress: {
          reduce_funcs: false,
        }
      }),

      // copy({
      //   hook: 'closeBundle',
      //   targets: [
      //     {
      //       dest: 'dist/devtools/view',
      //       src: `../devtools-extension/dist/*`,
      //     },
      //   ]
      // }),
    ]
  }
];

module.exports = [
  ...esModulesBuild,
  ...umdBuild,
  ...devtoolsSharedBuild,
];
