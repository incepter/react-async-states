import dts from 'vite-plugin-dts'
import {defineConfig} from 'vite'

import react from '@vitejs/plugin-react'
import vitePluginImp from 'vite-plugin-imp'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      name: 'Devtools',
      entry: 'src/index.tsx',
      fileName: 'index.development'
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
    dts(),
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
