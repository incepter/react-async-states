import { __DEV__, cloneProducerProps } from "shared";
import devtools from "devtools";
import { AsyncStateStateBuilder } from "./utils";
import {
  AbortFn,
  AsyncStateInterface,
  Producer,
  ProducerFunction,
  ProducerProps,
  WrappedProducerFunction
} from "./types";
import AsyncState from "./AsyncState";

export function wrapProducerFunction<T>(asyncState: AsyncState<T>): ProducerFunction<T> {
  // this allows the developer to omit the producer attribute.
  // and replaces state when there is no producer
  if (typeof asyncState.originalProducer !== "function") {
    return function delegateToReplaceState(props: ProducerProps<T>): undefined {
      asyncState.replaceState(props.args[0]);
      return; // makes ts happy
    }
  }
  // this is the real deal
  return function producerFuncImpl(props: ProducerProps<T>): undefined {
    // the running promise is used to pass the status to pending and as suspender in react18+
    let runningPromise;
    // the execution value is the return of the initial producer function
    let executionValue;
    // it is important to clone to capture properties and save only serializable stuff
    const savedProps = cloneProducerProps(props);

    try {
      executionValue = asyncState.originalProducer(props);
    } catch (e) {
      if (__DEV__) devtools.emitRunSync(asyncState, props);
      props.fulfilled = true;
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
        props.fulfilled = true;
        asyncState.setState(AsyncStateStateBuilder.error(e, savedProps));
        return;
      }
      if (generatorResult.done) {
        props.fulfilled = true;
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
      props.fulfilled = true;
      asyncState.setState(AsyncStateStateBuilder.success(executionValue, savedProps));
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = props.aborted;
        if (!aborted) {
          props.fulfilled = true;
          asyncState.setState(AsyncStateStateBuilder.success(stateData, savedProps));
        }
      })
      .catch(stateError => {
        let aborted = props.aborted;
        if (!aborted) {
          props.fulfilled = true;
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
  let lastGeneratorValue = generatorInstance.next();

  while (!lastGeneratorValue.done && !isPromise(lastGeneratorValue.value)) {
    lastGeneratorValue = generatorInstance.next(lastGeneratorValue.value);
  }

  if (lastGeneratorValue.done) {
    return {done: true, value: lastGeneratorValue.value};
  } else {
    // encountered a promise
    return new Promise((resolve, reject) => {
      const abortGenerator = stepAsyncAndContinueStartedGenerator(generatorInstance, lastGeneratorValue, resolve, reject);
      props.onAbort(abortGenerator);
    });
  }
}

function stepAsyncAndContinueStartedGenerator(generatorInstance, lastGeneratorValue, onDone, onReject) {
  let aborted = false;

  // we enter here only if startupValue is pending promise of the generator instance!
  lastGeneratorValue.value.then(step, onGeneratorCatch);

  function onGeneratorResolve(resolveValue) {
    if (aborted) {
      return;
    }
    if (!lastGeneratorValue.done) {
      step();
    } else {
      onDone(resolveValue);
    }
  }

  function onGeneratorCatch(e) {
    if (aborted) {
      return;
    }
    if (lastGeneratorValue.done) {
      onDone(e);
    } else {
      try {
        lastGeneratorValue = generatorInstance.throw(e);
      } catch (newException) {
        onReject(newException);
      }
      if (lastGeneratorValue.done) {
        onDone(lastGeneratorValue.value);
      } else {
        step();
      }
    }
  }

  function step() {
    if (aborted) {
      return;
    }
    try {
      lastGeneratorValue = generatorInstance.next(lastGeneratorValue.value);
    } catch (e) {
      onGeneratorCatch(e);
    }
    Promise
      .resolve(lastGeneratorValue.value)
      .then(onGeneratorResolve, onGeneratorCatch)
  }

  return function abort() {
    aborted = true;
  }
}
