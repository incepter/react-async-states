import { __DEV__, shallowClone } from "./shared";
import { logger } from "./logger";

export function warnDevAboutAsyncStateKey(key) {
  if (__DEV__) {
    if (typeof key !== "string") {
      logger.error(`Warning: Got a key for asyncState '${String(key)}' of type='${typeof key}'. Please consider using strings, especially if it will be forked.`)
    }
  }
}

export function warnDevAboutUndefinedPromise(key, fn) {
  if (__DEV__) {
    if (typeof fn !== "function") {
      logger.error(`Warning: The promise of asyncState with key='${key}' is not a function, received type '${typeof fn}'. This assumes that you are using it as a basic state that will be replaced by replaceState each time.`)
    }
  }
}

export function logInDevStateChange(key, state) {
  if (__DEV__) {
    logger.info(`[${key}][state change] to`, state);
    if (!state) {
      logger.error(`[${key}][state change] state is falsy:`, state);
      return;
    }
    if (!state.status) {
      logger.error(`[${key}][state change] state doesn't contain a mandatory 'status' property:`, state.status);
    }
    if (state.data === undefined) {
      logger.trace(`[${key}][state change] state's value (data) is undefined`);
    }
  }
}

export function logInDevPromiseRun(key, args) {
  if (__DEV__) {
    logger.info(`[${key}][run] with args object`, args);
  }
}

export function logInDevReplaceState(key, value) {
  if (__DEV__) {
    logger.debug(`[${key}][replace state] with value`, value);
  }
}

export function warnInDevAboutRunWhileLoading(key) {
  if (__DEV__) {
    logger.info(`[${key}][run while loading] previous run will be aborted`);
  }
}

export function logInDevDispose(key, locks) {
  if (__DEV__) {
    logger.info(`[${key}][disposing] disposal with current locks`, locks);
  }
}

export function logInDevAbort(key, reason) {
  if (__DEV__) {
    logger.info(`[${key}][abort] with reason`, reason);
  }
}
