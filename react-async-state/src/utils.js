export const ASYNC_STATUS = {
  error: "error",
  loading: "loading",
  success: "success",
  aborted: "aborted",
  initial: "initial",
};

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

/* istanbul ignore next */
export function invokeIfPresent(fn, ...args) {
  if (typeof fn === "function") {
    fn(...args);
  }
}
