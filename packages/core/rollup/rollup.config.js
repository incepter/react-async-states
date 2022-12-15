const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');

const esModulesBuild = [
  {
    input: `src/index.ts`,
    output: {
      dir: 'dist',
      format: "esm",
      sourcemap: true,
      preserveModules: true,
    },
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      json(),
      resolve(),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            target: 'ESNEXT',
            declaration: true,
          },
          exclude: [
            "node_modules",
            "src/__tests__",
          ]
        }
      }),
      commonjs(),
    ]
  }
];

module.exports = [
  ...esModulesBuild,
];
