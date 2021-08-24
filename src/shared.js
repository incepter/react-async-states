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

export function noop() {}

export function invokeIfPresent(fn, ...args) {
  if (typeof fn === "function") {
    return fn(...args);
  }
  return undefined;
}

export function isPromise(candidate) {
  return !!candidate && typeof candidate.then === "function";
}

export function isGenerator(candidate) {
  return !!candidate && typeof candidate.next === "function" && typeof candidate.throw === "function";
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
/**
 * will extract serializable and meaningful arguments to save
 * @param args array of parameters
 * @returns {{}[]|*}
 */
export function cloneArgs(args) {
  if (!args || !Array.isArray(args) || !args.length) {
    return args;
  }

  return [cloneAsyncStateArgsObject(args[0])];
}

export function cloneAsyncStateArgsObject(argsObj) {
  const output = {};

  if (argsObj.lastSuccess && Object.keys(argsObj.lastSuccess).length) {
    output.lastSuccess = shallowClone(argsObj.lastSuccess);
    delete output.lastSuccess["args"]; // cut the circular ref here
  }
  output.payload = shallowClone(argsObj.payload);
  delete output.payload["__provider__"]; // no need!

  if (Array.isArray(argsObj.executionArgs) && argsObj.executionArgs.length) {
    output.executionArgs = [...argsObj.executionArgs];
  }

  return output;
}
