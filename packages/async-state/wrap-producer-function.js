import { __DEV__, cloneProducerProps, invokeIfPresent } from "shared";
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
      asyncState.setState(AsyncStateStateBuilder.pending(savedProps));
      runningPromise = wrapStartedGenerator(executionValue, props);
      if (runningPromise.done) {
        asyncState.setState(AsyncStateStateBuilder.success(runningPromise.value, savedProps));
        return;
      }
    } else if (isPromise(executionValue)) {
      if (__DEV__) devtools.emitRunPromise(asyncState, props);
      asyncState.setState(AsyncStateStateBuilder.pending(savedProps));
      runningPromise = executionValue;
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
  const syncResult = runUntilPromiseEncounter(generatorInstance);

  if (!syncResult.done) {
    return new Promise((resolve, reject) => {
      const abortGenerator = stepAsyncAndContinueStartedGenerator(generatorInstance, syncResult.value, resolve, reject);
      props.onAbort(abortGenerator);
    });
  } else {
    return syncResult;
  }
}

function runUntilPromiseEncounter(generatorInstance) {
  let {done: actualDone, value: actualValue} = generatorInstance.next();

  while (!actualDone && !isPromise(actualValue)) {
    const {done, value} = generatorInstance.next(actualValue);
    actualValue = value;
    actualDone = done;
  }

  return {done: actualDone, value: actualValue};
}

function stepAsyncAndContinueStartedGenerator(generatorInstance, startupValue, onDone, onReject) {
  let aborted = false;

  /**
   * we enter here only if startupValue is pending promise of the generator instance!
   */
  startupValue.then(step);

  function step(oldValue) {
    let {done, value: actualValue} = generatorInstance.next(oldValue);

    Promise
      .resolve(actualValue)
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
          generatorInstance.throw(e);
        }
      });
  }

  return function abort() {
    aborted = true;
  }
}
