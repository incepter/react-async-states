import {defineConfig} from 'vite'
import copy from 'rollup-plugin-copy'
import react from '@vitejs/plugin-react'
import vitePluginImp from 'vite-plugin-imp'

// https://vitejs.dev/config/
export default defineConfig({
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
    copy({
      hook: 'closeBundle',
      targets: [
        {
          dest: 'dist/',
          src: `src/static/*`,
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
