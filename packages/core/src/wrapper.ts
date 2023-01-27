import {
  AbortFn,
  ProducerCallbacks,
  ProducerProps,
  ProducerWrapperInput,
  RunIndicators,
  State
} from "./types";
import {
  __DEV__,
  cloneProducerProps,
  isFunction,
  isGenerator,
  isPromise
} from "./utils";
import devtools from "./devtools/Devtools";
import {StateBuilder} from "./helpers/StateBuilder";
import {aborted, error, success,} from "./enums";

export function producerWrapper<T, E = any, R = any>(
  input: ProducerWrapperInput<T, E, R>,
  props: ProducerProps<T, E, R>,
  indicators: RunIndicators,
  callbacks?: ProducerCallbacks<T, E, R>,
): AbortFn {
  let {
    instance,
    setState,
    getProducer,
    setSuspender,
    replaceState
  } = input;
  let currentProducer = getProducer();

  if (!isFunction(currentProducer)) {
    indicators.fulfilled = true;
    setState(props.args[0], props.args[1], callbacks);
    return;
  }

  let pendingPromise;
  let executionValue;
  let savedProps = cloneProducerProps(props);

  try {
    executionValue = currentProducer!(props);
    if (indicators.aborted) {
      return;
    }
  } catch (e) {
    if (indicators.aborted) {
      return;
    }
    if (__DEV__ && instance) devtools.emitRunSync(instance, savedProps);
    let errorState = StateBuilder.error<T, E>(e, savedProps);

    indicators.fulfilled = true;
    replaceState(errorState, true, callbacks);
    return;
  }

  if (isGenerator<T>(executionValue)) {
    if (__DEV__ && instance) devtools.emitRunGenerator(instance, savedProps);
    // generatorResult is either {done, value} or a promise
    let generatorResult;
    try {
      generatorResult = stepGenerator(executionValue, props, indicators);
    } catch (e) {
      let errorState = StateBuilder.error<T, E>(e, savedProps);

      indicators.fulfilled = true;
      replaceState(errorState, true, callbacks);
      return;
    }
    if (generatorResult.done) {
      indicators.fulfilled = true;
      let successState = StateBuilder.success(generatorResult.value, savedProps);
      replaceState(successState, true, callbacks);
      return;
    } else {
      pendingPromise = generatorResult;
      setSuspender(pendingPromise);
      replaceState(StateBuilder.pending(savedProps), true, callbacks);
    }
  } else if (isPromise(executionValue)) {
    if (__DEV__ && instance) devtools.emitRunPromise(instance, savedProps);
    pendingPromise = executionValue;
    setSuspender(pendingPromise);
    replaceState(StateBuilder.pending(savedProps), true, callbacks);
  } else { // final value
    if (__DEV__ && instance) devtools.emitRunSync(instance, savedProps);
    indicators.fulfilled = true;
    let successState = StateBuilder.success(executionValue, savedProps);
    replaceState(successState, true, callbacks);
    return;
  }

  pendingPromise
    .then(stateData => {
      let aborted = indicators.aborted;
      if (!aborted) {
        indicators.fulfilled = true;
        let successState = StateBuilder.success(stateData, savedProps);
        replaceState(successState, true, callbacks);
      }
    })
    .catch(stateError => {
      let aborted = indicators.aborted;
      if (!aborted) {
        let errorState = StateBuilder.error<T, E>(stateError, savedProps);

        indicators.fulfilled = true;
        replaceState(errorState, true, callbacks);
      }
    });
}

function stepGenerator<T>(
  generatorInstance: Generator<any, T, any>,
  props,
  indicators
): {done: true, value: T} | Promise<T> {
  let generator = generatorInstance.next();

  while (!generator.done && !isPromise(generator.value)) {
    generator = generatorInstance.next(generator.value);
  }

  if (generator.done) {
    return {done: true, value: generator.value};
  } else {
    return new Promise(function stepIntoGenerator(resolve, reject) {
      const abortGenerator = stepInAsyncGenerator(
        generatorInstance,
        generator,
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

function stepInAsyncGenerator(
  generatorInstance,
  generator,
  onDone,
  onReject
) {
  let aborted = false;

  // we enter here only if startupValue is pending promise of the generator instance!
  generator.value.then(step, onGeneratorCatch);

  function onGeneratorResolve(resolveValue) {
    if (aborted) {
      return;
    }
    if (!generator.done) {
      step();
    } else {
      onDone(resolveValue);
    }
  }

  function onGeneratorCatch(e) {
    if (aborted) {
      return;
    }
    if (generator.done) {
      onDone(e);
    } else {
      try {
        generator = generatorInstance.throw(e);
      } catch (newException) {
        onReject(newException);
      }
      if (generator.done) {
        onDone(generator.value);
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
      generator = generatorInstance.next(generator.value);
    } catch (e) {
      onGeneratorCatch(e);
    }
    Promise
      .resolve(generator.value)
      .then(onGeneratorResolve, onGeneratorCatch)
  }

  return function abort() {
    aborted = true;
  }
}
