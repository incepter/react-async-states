import { ASYNC_STATUS, IRP } from "../../utils";

export function wrapPromise(asyncState) {
  if (!asyncState || !asyncState?.originalPromise) {
    return IRP;
  }
  return function promiseFuncImpl(...args) {
    asyncState.setState({
      args,
      data: null,
      status: ASYNC_STATUS.loading,
    });
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
          asyncState.setState({
            args,
            data: res,
            status: ASYNC_STATUS.success,
          });
        }
      })
      .catch(e => {
        let cancelled = args?.[0]?.cancelled;
        if (!cancelled) {
          asyncState.setState({
            args,
            data: e,
            status: ASYNC_STATUS.error,
          });
        }
        // return Promise.reject(e);
      });
  };
}
