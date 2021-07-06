import { EMPTY_OBJECT, ASYNC_STATUS, IRP } from "./utils";
import { notifySubscribers } from "./notify-subscribers";

export function wrapPromise(promiseState) {
  if (!promiseState || !promiseState?.originalPromise) {
    return IRP;
  }
  return function promiseFuncImpl(...args) {
    promiseState.oldState = { ...(promiseState.currentState ?? EMPTY_OBJECT) };
    promiseState.currentState = {
      args,
      data: null,
      error: null,
      status: ASYNC_STATUS.loading,
    };
    notifySubscribers(promiseState);

    // todo: differentiate between promises and generator to apply properly runner logic
    // todo: add promiseRunner and genRunner

    const executionPrimaryResult = promiseState
      .originalPromise(...args);

    return executionPrimaryResult
      .then(res => {
        promiseState.oldState = {
          ...(promiseState.currentState ?? EMPTY_OBJECT),
        };
        promiseState.currentState = {
          args,
          data: res,
          error: null,
          status: ASYNC_STATUS.success,
        };
        notifySubscribers(promiseState);
        return Promise.resolve(res);
      })
      .catch(e => {
        promiseState.oldState = {
          ...(promiseState.currentState ?? EMPTY_OBJECT),
        };
        promiseState.currentState = {
          args,
          error: e,
          data: null,
          status: ASYNC_STATUS.error,
        };
        notifySubscribers(promiseState);
        // return Promise.reject(e);
      });
  };
}
