
export function isFunction(fn): fn is Function {
  return typeof fn === "function";
}
export function noop(): void {
  // that's a noop fn
}
