import type { Config } from "tailwindcss";
import { generateColorTokens } from "./helpers/colors";

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
