type ColorName =
  | "primary"
  | "secondary"
  | "error"
  | "warning"
  | "info"
  | "success";

export const generateColorTokens = (color: ColorName) => {
  return {
    DEFAULT: `hsl(var(--color-${color}-default) / <alpha-value>)`,
    light: `hsl(var(--color-${color}-light) / <alpha-value>)`,
    dark: `hsl(var(--color-${color}-dark) / <alpha-value>)`,
    "contrast-text": `rgb(var(--color-${color}-contrast-text) / <alpha-value>)`,
  };
};
