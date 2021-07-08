import { AsyncStateBuilder } from "../StateBuilder";

export function wrapPromise(asyncState) {
  return function promiseFuncImpl(...args) {
    asyncState.setState(AsyncStateBuilder.loading(args));
    // todo: differentiate between promises and generator to apply properly runner logic
    // todo: add promiseRunner and genRunner

    const executionPrimaryResult = Promise.resolve(
      asyncState
        .originalPromise(...args)
    );

    return executionPrimaryResult
      .then(res => {
        let cancelled = args?.[0]?.cancelled;
        if (!cancelled) {
          asyncState.setState(AsyncStateBuilder.success(res, args));
        }
      })
      .catch(e => {
        let cancelled = args?.[0]?.cancelled;
        if (!cancelled) {
          asyncState.setState(AsyncStateBuilder.error(e, args));
        }
        // return Promise.reject(e);
      });
  };
}
