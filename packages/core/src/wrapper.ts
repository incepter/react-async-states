import {
  AbortFn,
  ProducerCallbacks,
  ProducerProps,
  ProducerWrapperInput,
  RunIndicators
} from "./types";
import {
  __DEV__,
  cloneProducerProps,
  isFunction,
  isGenerator,
  isPromise,
  StateBuilder
} from "./utils";
import {ProducerType, Status} from "./enums";
import devtools from "./devtools/Devtools";

export function producerWrapper<T, E = any, R = any>(
  input: ProducerWrapperInput<T, E, R>,
  props: ProducerProps<T, E, R>,
  indicators: RunIndicators,
  callbacks?: ProducerCallbacks<T, E, R>,
): AbortFn {
  const currentProducer = input.getProducer();
  if (!isFunction(currentProducer)) {
    indicators.fulfilled = true;
    input.setProducerType(ProducerType.notProvided);
    input.setState(props.args[0], props.args[1]);

    if (callbacks) {
      let currentState = input.getState();
      switch (currentState.status) {
        case Status.success: {
          callbacks.onSuccess?.(currentState);
          break;
        }
        case Status.aborted: {
          callbacks.onAborted?.(currentState);
          break;
        }
        case Status.error: {
          callbacks.onError?.(currentState);
          break;
        }
      }
    }
    return;
  }
  // the running promise is used to pass the status to pending and as suspender in react18+
  let runningPromise;
  // the execution value is the return of the initial producer function
  let executionValue;
  // it is important to clone to capture properties and save only serializable stuff
  const savedProps = cloneProducerProps(props);

  try {
    executionValue = currentProducer!(props);
    if (indicators.aborted) {
      return;
    }
  } catch (e) {
    if (indicators.aborted) {
      return;
    }
    if (__DEV__ && input.instance) devtools.emitRunSync(input.instance, savedProps);
    indicators.fulfilled = true;
    let errorState = StateBuilder.error<T, E>(e, savedProps);
    input.replaceState(errorState);
    callbacks?.onError?.(errorState);
    return;
  }

  if (isGenerator(executionValue)) {
    input.setProducerType(ProducerType.generator);
    if (__DEV__ && input.instance) devtools.emitRunGenerator(input.instance, savedProps);
    // generatorResult is either {done, value} or a promise
    let generatorResult;
    try {
      generatorResult = wrapStartedGenerator(executionValue, props, indicators);
    } catch (e) {
      indicators.fulfilled = true;
      let errorState = StateBuilder.error<T, E>(e, savedProps);
      input.replaceState(errorState);
      callbacks?.onError?.(errorState);
      return;
    }
    if (generatorResult.done) {
      indicators.fulfilled = true;
      let successState = StateBuilder.success(generatorResult.value, savedProps);
      input.replaceState(successState);
      callbacks?.onSuccess?.(successState);
      return;
    } else {
      runningPromise = generatorResult;
      input.setSuspender(runningPromise);
      input.replaceState(StateBuilder.pending(savedProps));
    }
  } else if (isPromise(executionValue)) {
    input.setProducerType(ProducerType.promise);
    if (__DEV__ && input.instance) devtools.emitRunPromise(input.instance, savedProps);
    runningPromise = executionValue;
    input.setSuspender(runningPromise);
    input.replaceState(StateBuilder.pending(savedProps));
  } else { // final value
    if (__DEV__ && input.instance) devtools.emitRunSync(input.instance, savedProps);
    indicators.fulfilled = true;
    input.setProducerType(ProducerType.sync);
    let successState = StateBuilder.success(executionValue, savedProps);
    input.replaceState(successState);
    callbacks?.onSuccess?.(successState);
    return;
  }

  runningPromise
    .then(stateData => {
      let aborted = indicators.aborted;
      if (!aborted) {
        indicators.fulfilled = true;
        let successState = StateBuilder.success(stateData, savedProps);
        input.replaceState(successState);
        callbacks?.onSuccess?.(successState);
      }
    })
    .catch(stateError => {
      let aborted = indicators.aborted;
      if (!aborted) {
        indicators.fulfilled = true;
        let errorState = StateBuilder.error<T, E>(stateError, savedProps);
        input.replaceState(errorState);
        callbacks?.onError?.(errorState);
      }
    });
}

function wrapStartedGenerator(
  generatorInstance,
  props,
  indicators
) {
  let lastGeneratorValue = generatorInstance.next();

  while (!lastGeneratorValue.done && !isPromise(lastGeneratorValue.value)) {
    lastGeneratorValue = generatorInstance.next(lastGeneratorValue.value);
  }

  if (lastGeneratorValue.done) {
    return {done: true, value: lastGeneratorValue.value};
  } else {
    // encountered a promise
    return new Promise((
      resolve,
      reject
    ) => {
      const abortGenerator = stepAsyncAndContinueStartedGenerator(
        generatorInstance,
        lastGeneratorValue,
        resolve,
        reject
      );

      function abortFn() {
        if (!indicators.fulfilled && !indicators.aborted) {
          abortGenerator();
        }
      }

      props.onAbort(abortFn);
    });
  }
}

function stepAsyncAndContinueStartedGenerator(
  generatorInstance,
  lastGeneratorValue,
  onDone,
  onReject
) {
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
