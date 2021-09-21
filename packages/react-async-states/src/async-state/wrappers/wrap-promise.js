import { AsyncStateStateBuilder } from "../StateBuilder";
import { cloneArgs, isGenerator, isPromise } from "../../shared";
import { wrapGenerator } from "./wrap-generator";
import devtools from "../../devtools/devtools";

function returnsUndefined() {
  return undefined;
}

export function wrapPromise(asyncState) {
  // identifies promises that will be used with replaceState rather than run;
  // this allows the developer to omit the promise attribute.
  if (typeof asyncState.originalPromise !== "function") {
    return function delegateToReplaceState(argv) {
      return asyncState.replaceState(argv.executionArgs[0]);
    }
  }
  return function promiseFuncImpl(...args) {
    let runningPromise;
    // todo: catch this execution
    const executionValue = asyncState.originalPromise(...args);

    const clonedArgs = cloneArgs(args);
    if (isGenerator(executionValue)) {
      devtools.emitRunType(asyncState, "generator");
      asyncState.setState(AsyncStateStateBuilder.pending(clonedArgs));
      runningPromise = wrapGenerator(executionValue, asyncState, args);
    } else if (isPromise(executionValue)) {
      devtools.emitRunType(asyncState, "promise");
      asyncState.setState(AsyncStateStateBuilder.pending(clonedArgs));
      runningPromise = executionValue;
    } else { // final value
      devtools.emitRunType(asyncState, "sync");
      asyncState.setState(AsyncStateStateBuilder.success(executionValue, clonedArgs));
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = args[0].aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.success(stateData, clonedArgs));
        }
      })
      .catch(stateError => {
        let aborted = args[0].aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.error(stateError, clonedArgs));
        }
        // return Promise.reject(stateError);
      });
  };
}
