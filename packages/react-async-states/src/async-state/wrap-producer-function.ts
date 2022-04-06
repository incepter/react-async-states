import {__DEV__, cloneProducerProps, isGenerator, isPromise} from "shared";
import devtools from "devtools";
import {StateBuilder} from "./utils";
import {ProducerFunction, ProducerProps, ProducerType, State} from "./types";
import AsyncState from "./AsyncState";

export function wrapProducerFunction<T>(asyncState: AsyncState<T>): ProducerFunction<T> {
  // this is the real deal
  return function producerFuncImpl(props: ProducerProps<T>): undefined {
    // this allows the developer to omit the producer attribute.
    // and replaces state when there is no producer
    if (typeof asyncState.originalProducer !== "function") {
      props.fulfilled = true;
      asyncState.replaceState(props.args[0]);
      return; // makes ts happy
    }
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
      asyncState.setState(StateBuilder.error(e, savedProps));
      return;
    }

    if (isGenerator(executionValue)) {
      asyncState.producerType = ProducerType.generator;
      if (__DEV__) devtools.emitRunGenerator(asyncState, props);
      // generatorResult is either {done, value} or a promise
      let generatorResult;
      try {
        generatorResult = wrapStartedGenerator(executionValue, props);
      } catch (e) {
        props.fulfilled = true;
        asyncState.setState(StateBuilder.error(e, savedProps));
        return;
      }
      if (generatorResult.done) {
        props.fulfilled = true;
        asyncState.setState(StateBuilder.success(generatorResult.value, savedProps));
        return;
      } else {
        runningPromise = generatorResult;
        asyncState.suspender = runningPromise;
        asyncState.setState(StateBuilder.pending(savedProps) as State<any>);
      }
    } else if (isPromise(executionValue)) {
      asyncState.producerType = ProducerType.promise;
      if (__DEV__) devtools.emitRunPromise(asyncState, props);
      runningPromise = executionValue;
      asyncState.suspender = runningPromise;
      asyncState.setState(StateBuilder.pending(savedProps) as State<any>);
    } else { // final value
      if (__DEV__) devtools.emitRunSync(asyncState, props);
      props.fulfilled = true;
      asyncState.producerType = ProducerType.sync;
      asyncState.setState(StateBuilder.success(executionValue, savedProps));
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = props.aborted;
        if (!aborted) {
          props.fulfilled = true;
          asyncState.setState(StateBuilder.success(stateData, savedProps));
        }
      })
      .catch(stateError => {
        let aborted = props.aborted;
        if (!aborted) {
          props.fulfilled = true;
          asyncState.setState(StateBuilder.error(stateError, savedProps));
        }
      });
  };
}

function wrapStartedGenerator(
  generatorInstance,
  props
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
        if (!props.fulfilled && !props.aborted) {
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
