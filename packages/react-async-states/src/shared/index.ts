export const __DEV__ = process.env.NODE_ENV !== "production";

export function isFunction(fn) {
  return typeof fn === "function";
}

export const emptyArray = [];

