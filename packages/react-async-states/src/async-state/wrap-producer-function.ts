import {cloneProducerProps, isGenerator, isPromise} from "shared";
import {StateBuilder} from "./utils";
import {
  Producer,
  ProducerFunction,
  ProducerProps,
  ProducerType,
  RunIndicators,
  State, StateUpdater
} from "./types";

export function wrapProducerFunction<T>(
  producer: Producer<T> | null | undefined,
  onChange: (newState: State<T>) => void,
  replace: StateUpdater<T>,
  setType: (type: ProducerType) => void,
  setSuspender: (suspender: Promise<T>) => void,
): ProducerFunction<T> {
  // this is the real deal
  return function producerFuncImpl(props: ProducerProps<T>, indicators: RunIndicators): undefined {
    // this allows the developer to omit the producer attribute.
    // and replaces state when there is no producer
    if (typeof producer !== "function") {
      indicators.fulfilled = true;
      replace(props.args[0], props.args[1]);
      return;
    }
    // the running promise is used to pass the status to pending and as suspender in react18+
    let runningPromise;
    // the execution value is the return of the initial producer function
    let executionValue;
    // it is important to clone to capture properties and save only serializable stuff
    const savedProps = cloneProducerProps(props);

    try {
      executionValue = producer(props);

    } catch (e) {
      indicators.fulfilled = true;
      onChange(StateBuilder.error(e, savedProps));
      return;
    }

    if (isGenerator(executionValue)) {
      setType(ProducerType.generator);
      // generatorResult is either {done, value} or a promise
      let generatorResult;
      try {
        generatorResult = wrapStartedGenerator(executionValue, props, indicators);
      } catch (e) {
        indicators.fulfilled = true;
        onChange(StateBuilder.error(e, savedProps));
        return;
      }
      if (generatorResult.done) {
        indicators.fulfilled = true;
        onChange(StateBuilder.success(generatorResult.value, savedProps));
        return;
      } else {
        runningPromise = generatorResult;
        setSuspender(runningPromise);
        onChange(StateBuilder.pending(savedProps) as State<any>);
      }
    } else if (isPromise(executionValue)) {
      setType(ProducerType.promise);
      runningPromise = executionValue;
      setSuspender(runningPromise);
      onChange(StateBuilder.pending(savedProps) as State<any>);
    } else { // final value
      indicators.fulfilled = true;
      setType(ProducerType.sync);
      onChange(StateBuilder.success(executionValue, savedProps));
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = indicators.aborted;
        if (!aborted) {
          indicators.fulfilled = true;
          onChange(StateBuilder.success(stateData, savedProps));
        }
      })
      .catch(stateError => {
        let aborted = indicators.aborted;
        if (!aborted) {
          indicators.fulfilled = true;
          onChange(StateBuilder.error(stateError, savedProps));
        }
      });
  };
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
