import { __DEV__, cloneProducerProps } from "shared";
import devtools from "devtools";
import { AsyncStateStateBuilder } from "./utils";

export function wrapProducerFunction(asyncState) {
  // this allows the developer to omit the producer attribute.
  // and replaces state when there is no producer
  if (typeof asyncState.originalProducer !== "function") {
    return function delegateToReplaceState(props) {
      return asyncState.replaceState(props.args[0]);
    }
  }
  return function producerFuncImpl(props) {
    let runningPromise;
    let executionValue;
    const savedProps = cloneProducerProps(props);

    try {
      executionValue = asyncState.originalProducer(props);
    } catch (e) {
      if (__DEV__) devtools.emitRunSync(asyncState, props);
      asyncState.setState(AsyncStateStateBuilder.error(e, savedProps));
      return;
    }

    if (isGenerator(executionValue)) {
      if (__DEV__) devtools.emitRunGenerator(asyncState, props);
      // generatorResult is either {done, value} or a promise
      let generatorResult;
      try {
        generatorResult = wrapStartedGenerator(executionValue, props);
      } catch (e) {
        asyncState.setState(AsyncStateStateBuilder.error(e, savedProps));
        return;
      }
      if (generatorResult.done) {
        asyncState.setState(AsyncStateStateBuilder.success(generatorResult.value, savedProps));
        return;
      } else {
        runningPromise = generatorResult;
        asyncState.suspender = runningPromise;
        asyncState.setState(AsyncStateStateBuilder.pending(savedProps));
      }
    } else if (isPromise(executionValue)) {
      if (__DEV__) devtools.emitRunPromise(asyncState, props);
      runningPromise = executionValue;
      asyncState.suspender = runningPromise;
      asyncState.setState(AsyncStateStateBuilder.pending(savedProps));
    } else { // final value
      if (__DEV__) devtools.emitRunSync(asyncState, props);
      asyncState.setState(AsyncStateStateBuilder.success(executionValue, savedProps));
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = props.aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.success(stateData, savedProps));
        }
      })
      .catch(stateError => {
        let aborted = props.aborted;
        if (!aborted) {
          asyncState.setState(AsyncStateStateBuilder.error(stateError, savedProps));
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

function wrapStartedGenerator(generatorInstance, props) {
  let {done, value} = generatorInstance.next();

  while (!done && !isPromise(value)) {
    const next = generatorInstance.next(value);
    done = next.done;
    value = next.value;
  }

  if (done) {
    return {done, value};
  } else {
    // encountered a promise
    return new Promise((resolve, reject) => {
      const abortGenerator = stepAsyncAndContinueStartedGenerator(generatorInstance, value, resolve, reject);
      props.onAbort(abortGenerator);
    });
  }
}

function stepAsyncAndContinueStartedGenerator(generatorInstance, startupValue, onDone, onReject) {
  let aborted = false;

  // we enter here only if startupValue is pending promise of the generator instance!
  startupValue.then(step);

  function step(oldValue) {
    let done = undefined, value = undefined;
    try {
      let nextValue = generatorInstance.next(oldValue);
      done = nextValue.done;
      value = nextValue.value;
    } catch (e) {
      onReject(e);
    }

    // we don't know if value is a promise of a js-value
    Promise
      .resolve(value)
      .then(function continueGenerator(resolveValue) {
        if (!done && !aborted) {
          step(resolveValue);
        }
        if (done && !aborted) {
          onDone(resolveValue);
        }
      })
      .catch(function onCatch(e) {
        if (!aborted && !done) {
          onReject(e);
        }
      });
  }

  return function abort() {
    aborted = true;
  }
}
