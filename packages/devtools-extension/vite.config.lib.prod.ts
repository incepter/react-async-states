import {defineConfig} from 'vite'
import copy from 'rollup-plugin-copy'
import replace from '@rollup/plugin-replace'

import react from '@vitejs/plugin-react'
import vitePluginImp from 'vite-plugin-imp'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      name: 'Devtools',
      entry: 'src/lib-entry.tsx',
      fileName: 'index.production'
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-async-states'],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime',
          'react-async-states': 'ReactAsyncStates',
        }
      },
    },
  },
  optimizeDeps: {
    exclude: ["antd"],
  },

  plugins: [
    react(),
    vitePluginImp({
      libList: [
        {
          libName: "antd",
          libDirectory: "lib",
          style: (name) => `antd/es/${name}/style`,
        },
      ],
    }),
    replace({
      preventAssignment: true,
      values: {"process.env.NODE_ENV": JSON.stringify("production")},
    }),

    copy({
      targets: [
        {
          dest: 'dist',
          rename: 'index.umd.js',
          src: 'src/index-prod.js',
        },
      ]
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: [
      {find: /^~/, replacement: ""},
    ],
  },
})
