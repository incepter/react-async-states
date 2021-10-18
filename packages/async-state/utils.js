import { __DEV__, AsyncStateStatus } from "shared";

export function warnDevAboutAsyncStateKey(key) {
  if (__DEV__) {
    if (typeof key !== "string") {
      console.error(`Warning: Got a key for asyncState '${String(key)}' of type='${typeof key}'. Please consider using strings, especially if it will be forked.`)
    }
  }
}

export function warnDevAboutUndefinedPromise(key, fn) {
  if (__DEV__) {
    if (typeof fn !== "function") {
      console.error(`Warning: The promise of asyncState with key='${key}' is not a function, received type '${typeof fn}'. This assumes that you are using it as a basic state that will be replaced by replaceState each time.`)
    }
  }
}

export function warnInDevAboutRunWhilePending(key) {
  if (__DEV__) {
    console.log(`[${key}][run while pending] previous run will be aborted`);
  }
}

function Secret() {
  const vault = new WeakMap();
  return function Source() {
    if (arguments.length === 1) {
      return vault.get(arguments[0]);
    }
    if (arguments.length === 2) {
      vault.set(arguments[0], arguments[1]);
    }
  };
}

function objectWithHiddenProperty(key, value) {
  let output = new (Secret())();
  output.constructor(key, value);

  return output;
}

const asyncStatesKey = Object.freeze(Object.create(null));
export function constructAsyncStateSource(asyncState) {
  return objectWithHiddenProperty(asyncStatesKey, asyncState);
}

export function readAsyncStateFromSource(source, throwError = true) {
  try {
    return source.constructor(asyncStatesKey); // async state instance
  } catch (e) {
    if (throwError) {
      const errorString = "You ve passed an incompatible source object. Please make sure to pass the received source object.";
      console.error(errorString);
      throw new Error(errorString);
    }
  }
}

function state(status, data, argv) {
  return Object.freeze({status, data, argv});
}

export const AsyncStateStateBuilder = Object.freeze({
  initial: initialValue => state(AsyncStateStatus.initial, initialValue, null),
  error: (data, argv) => state(AsyncStateStatus.error, data, argv),
  success: (data, argv) => state(AsyncStateStatus.success, data, argv),
  pending: argv => state(AsyncStateStatus.pending, null, argv),
  aborted: (reason, argv) => state(AsyncStateStatus.aborted, reason, argv),
});
