import { AsyncStateStateBuilder } from "../StateBuilder";

export function wrapPromise(asyncState) {
  return function promiseFuncImpl(...args) {
    asyncState.setState(AsyncStateStateBuilder.loading(args));
    // todo: differentiate between promises and generator to apply properly runner logic
    // todo: add promiseRunner and genRunner

    const executionPrimaryResult = Promise.resolve(
      asyncState
        .originalPromise(...args)
    );

    return executionPrimaryResult
      .then(stateData => {
        let aborted = args[0].aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.success(stateData, args));
        }
      })
      .catch(stateError => {
        let aborted = args[0].aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.error(stateError, args));
        }
        // return Promise.reject(stateError);
      });
  };
}
