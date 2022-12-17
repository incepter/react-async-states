export const __DEV__ = process.env.NODE_ENV !== "production";

// avoid spreading penalty!
export function shallowClone(
  source1,
  source2?
) {
  return Object.assign({}, source1, source2);
}

export function isPromise(candidate) {
  return !!candidate && isFunction(candidate.then);
}

export function isGenerator(candidate) {
  return !!candidate && isFunction(candidate.next) && isFunction(candidate.throw);
}

export function isFunction(fn) {
  return typeof fn === "function";
}
