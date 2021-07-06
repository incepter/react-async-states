export const ASYNC_STATUS = {
  error: "error",
  loading: "loading",
  success: "success",
  initial: "initial",
};

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

export function invokeIfPresent(fn, ...args) {
  if (typeof fn === "function") {
    fn(...args);
  }
}

export function IRP(...args) {
  return Promise.resolve(...args);
}
