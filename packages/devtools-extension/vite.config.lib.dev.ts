import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";
import vitePluginImp from "vite-plugin-imp";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    lib: {
      name: "Devtools",
      entry: "src/index.tsx",
      formats: ["es", "umd"],
      fileName: "index.development",
    },
    rollupOptions: {
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "react-async-states",
        "async-states",
        "react-json-view",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "async-states": "AsyncStates",
          "react/jsx-runtime": "jsxRuntime",
          "react-async-states": "ReactAsyncStates",
          "react-json-view": "ReactJsonView",
        },
      },
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
    alias: [{ find: /^~/, replacement: "" }],
  },
});
