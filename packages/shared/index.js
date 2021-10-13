export const __DEV__ = process.env.NODE_ENV !== "production";

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

// avoid spreading penalty!
export function shallowClone(source1, source2) {
  return Object.assign({}, source1, source2);
}

export const AsyncStateStatus = {
  error: "error",
  pending: "pending",
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

export function shallowEqual(prev, next) {
  return prev === next;
}

export function identity(...args) {
  if (!args || !args.length) {
    return undefined;
  }
  return args.length === 1 ? args[0] : args;
}

export function oneObjectIdentity(obj) {
  return obj;
}

export function cloneArgs(argv) {
  return cloneAsyncStateArgsObject(argv);
}

export function cloneAsyncStateArgsObject(argsObj) {
  const output = {};

  if (argsObj.lastSuccess && Object.keys(argsObj.lastSuccess).length) {
    output.lastSuccess = shallowClone(argsObj.lastSuccess);
    delete output.lastSuccess.argv; // cut the circular ref here
  }
  output.payload = shallowClone(argsObj.payload);
  delete output.payload["__provider__"]; // no need!

  if (Array.isArray(argsObj.args) && argsObj.args.length) {
    output.args = [...argsObj.args];
  }

  return output;
}
