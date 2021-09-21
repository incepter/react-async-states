import { __DEV__ } from "./shared";

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
