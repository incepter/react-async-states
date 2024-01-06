import { generateColorTokens } from "./lib/colors";

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        foreground: {
          primary: "hsl(var(--color-foreground-primary) / <alpha-value>)",
          secondary: "hsl(var(--color-foreground-secondary) / <alpha-value>)",
        },
        background: {
          DEFAULT: "hsl(var(--color-background-default) / <alpha-value>)",
        },
        neutral: {
          DEFAULT: "hsl(var(--color-neutral-default) / <alpha-value>)",
        },
        primary: generateColorTokens("primary"),
        secondary: generateColorTokens("secondary"),
        error: generateColorTokens("error"),
        warning: generateColorTokens("warning"),
        info: generateColorTokens("info"),
        success: generateColorTokens("success"),
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
