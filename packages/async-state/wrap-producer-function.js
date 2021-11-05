import { __DEV__, cloneArgs, invokeIfPresent } from "shared";
import devtools from "devtools";
import { AsyncStateStateBuilder } from "./utils";

export function wrapProducerFunction(asyncState) {
  // this allows the developer to omit the producer attribute.
  // and replaces state when there is no producer
  if (typeof asyncState.originalProducer !== "function") {
    return function delegateToReplaceState(argv) {
      return asyncState.replaceState(argv.args[0]);
    }
  }
  return function producerFuncImpl(argv) {
    let runningPromise;
    let executionValue;
    const clonedArgv = cloneArgs(argv);

    try {
      executionValue = asyncState.originalProducer(argv);
    } catch (e) {
      if (__DEV__) devtools.emitRunSync(asyncState, argv);
      asyncState.setState(AsyncStateStateBuilder.error(e, clonedArgv));
      return;
    }

    if (isGenerator(executionValue)) {
      if (__DEV__) devtools.emitRunGenerator(asyncState, argv);
      asyncState.setState(AsyncStateStateBuilder.pending(clonedArgv));
      runningPromise = wrapGenerator(executionValue, asyncState, argv);
    } else if (isPromise(executionValue)) {
      if (__DEV__) devtools.emitRunPromise(asyncState, argv);
      asyncState.setState(AsyncStateStateBuilder.pending(clonedArgv));
      runningPromise = executionValue;
    } else { // final value
      if (__DEV__) devtools.emitRunSync(asyncState, argv);
      asyncState.setState(AsyncStateStateBuilder.success(executionValue, clonedArgv));
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = argv.aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.success(stateData, clonedArgv));
        }
      })
      .catch(stateError => {
        let aborted = argv.aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.error(stateError, clonedArgv));
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
    argsArray.onAbort(stepAndContinueGenerator(generator, resolve, reject));
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
      .catch(function onCatch(e) {
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
