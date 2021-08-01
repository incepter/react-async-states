export const __DEV__ = process.env.NODE_ENV !== "production";

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

export function mergeObjects(obj1, obj2) {
  return {...(obj1 ?? EMPTY_OBJECT), ...(obj2 ?? EMPTY_OBJECT)};
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

export function invokeIfPresent(fn, ...args) {
  if (typeof fn === "function") {
    return fn(...args);
  }
  return undefined;
}

