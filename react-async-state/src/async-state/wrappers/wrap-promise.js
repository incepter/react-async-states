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
        let aborted = args?.[0]?.aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateBuilder.success(res, args));
        }
      })
      .catch(e => {
        let aborted = args?.[0]?.aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateBuilder.error(e, args));
        }
        // return Promise.reject(e);
      });
  };
}
