import dts from 'vite-plugin-dts'
import {defineConfig} from 'vite'

import react from '@vitejs/plugin-react'
import vitePluginImp from 'vite-plugin-imp'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'Devtools',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-async-states'],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'jsxRuntime',
          'react-async-states': 'ReactAsyncStates',
        }
      }
    },
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
    dts()
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
