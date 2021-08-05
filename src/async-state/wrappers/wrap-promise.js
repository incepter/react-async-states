import { AsyncStateStateBuilder } from "../StateBuilder";
import { isGenerator, isPromise } from "../../shared";
import { wrapGenerator } from "./wrap-generator";
import { logger } from "../../logger";

export function wrapPromise(asyncState) {
  return function promiseFuncImpl(...args) {
    let runningPromise;
    const executionValue = asyncState.originalPromise(...args);
    if (isGenerator(executionValue)) {
      logger.info(`[${asyncState.key}][is a generator]`);
      asyncState.setState(AsyncStateStateBuilder.loading(args));
      runningPromise = wrapGenerator(executionValue, asyncState, args);
    } else if (isPromise(executionValue)) {
      logger.info(`[${asyncState.key}][is a promise]`);
      asyncState.setState(AsyncStateStateBuilder.loading(args));
      runningPromise = executionValue;
    } else { // final value
      logger.info(`[${asyncState.key}][resolved immediately] - skiping the loading state`);
      asyncState.setState(AsyncStateStateBuilder.success(executionValue, args));
      return;
    }

    runningPromise
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
