import { cloneArgs, invokeIfPresent } from "shared";
import devtools from "devtools";
import { AsyncStateStateBuilder } from "./utils";

export function wrapPromiseFunction(asyncState) {
  // identifies promises that will be used with replaceState rather than run;
  // this allows the developer to omit the promise attribute.
  if (typeof asyncState.originalPromise !== "function") {
    return function delegateToReplaceState(argv) {
      return asyncState.replaceState(argv.executionArgs[0]);
    }
  }
  return function promiseFuncImpl(...args) {
    let runningPromise;
    let executionValue;
    const clonedArgs = cloneArgs(args);

    try {
      executionValue = asyncState.originalPromise(...args);
    } catch (e) {
      devtools.emitRunSync(asyncState, args[0]);
      asyncState.setState(AsyncStateStateBuilder.error(e, clonedArgs));
      return;
    }

    if (isGenerator(executionValue)) {
      devtools.emitRunGenerator(asyncState, args[0]);
      asyncState.setState(AsyncStateStateBuilder.pending(clonedArgs));
      runningPromise = wrapGenerator(executionValue, asyncState, args);
    } else if (isPromise(executionValue)) {
      devtools.emitRunPromise(asyncState, args[0]);
      asyncState.setState(AsyncStateStateBuilder.pending(clonedArgs));
      runningPromise = executionValue;
    } else { // final value
      devtools.emitRunSync(asyncState, args[0]);
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
      });
  };
}

function isPromise(candidate) {
  return !!candidate && typeof candidate.then === "function";
}

function isGenerator(candidate) {
  return !!candidate && typeof candidate.next === "function" && typeof candidate.throw === "function";
}

function wrapGenerator(generator, asyncState, argsArray) {
  return new Promise((resolve, reject) => {
    argsArray[0].onAbort(stepAndContinueGenerator(generator, resolve, reject));
  });
}

function stepAndContinueGenerator(generator, onDone, onReject) {
  let aborted = false;

  function step(input) {
    // if we try to step in an already finished generator, we throw. That's a bug
    if (generator.done) throw new Error("generator already done! cannot step further");

    // now, move generator forward
    let next = generator.next(input);
    // is it done now ?
    const {done} = next;

    let promise = Promise.resolve(next.value);

    promise
      .then(function continueGenerator(value) {
        if (!done && !aborted) {
          step(value);
        }
        if (done && !aborted) {
          invokeIfPresent(onDone, value);
        }
      })
      .catch(function onCatch(e){
        if (!aborted && !done) {
          invokeIfPresent(onReject, e);
          generator.throw(e);
        }
      })
  }

  step();

  return function abort() {
    aborted = true;
  }
}
