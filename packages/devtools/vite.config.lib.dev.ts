import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

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
        "react-dom",
        "async-states",
        "react-json-view",
        "react/jsx-runtime",
        "react-async-states",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "async-states": "AsyncStates",
          "react-json-view": "ReactJson",
          "react/jsx-runtime": "jsxRuntime",
          "react-async-states": "ReactAsyncStates",
        },
      },
    },
  },

  plugins: [
    dts(),
    react()
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
