import { ASYNC_STATUS, EMPTY_OBJECT, IRP } from "../../utils";
import { notifySubscribers } from "../notify-subscribers";

export function wrapPromise(asyncState) {
  if (!asyncState || !asyncState?.originalPromise) {
    return IRP;
  }
  return function promiseFuncImpl(...args) {
    asyncState.oldState = { ...(asyncState.currentState ?? EMPTY_OBJECT) };
    asyncState.currentState = {
      args,
      data: null,
      status: ASYNC_STATUS.loading,
    };
    notifySubscribers(asyncState);

    // todo: differentiate between promises and generator to apply properly runner logic
    // todo: add promiseRunner and genRunner

    const executionPrimaryResult = Promise.resolve(
      asyncState
        .originalPromise(...args)
    );

    return executionPrimaryResult
      .then(res => {
        asyncState.oldState = {
          ...(asyncState.currentState ?? EMPTY_OBJECT),
        };
        asyncState.currentState = {
          args,
          data: res,
          status: ASYNC_STATUS.success,
        };
        notifySubscribers(asyncState);
        return Promise.resolve(res);
      })
      .catch(e => {
        asyncState.oldState = {
          ...(asyncState.currentState ?? EMPTY_OBJECT),
        };
        asyncState.currentState = {
          args,
          data: e,
          status: ASYNC_STATUS.error,
        };
        notifySubscribers(asyncState);
        // return Promise.reject(e);
      });
  };
}
