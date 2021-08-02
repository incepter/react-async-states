export const __DEV__ = process.env.NODE_ENV !== "production";

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

// avoid spreading penalty!
export function shallowClone(source1, source2) {
  return Object.assign({}, source1, source2);
}

export const AsyncStateStatus = {
  error: "error",
  loading: "loading",
  success: "success",
  aborted: "aborted",
  initial: "initial",
};

export function asyncify(fn) {
  return function caller(...args) {
    return Promise.resolve().then(function callFn() {
      invokeIfPresent(fn, ...args);
    });
  }
}

export function noop() {}

export function invokeIfPresent(fn, ...args) {
  if (typeof fn === "function") {
    return fn(...args);
  }
  return undefined;
}
