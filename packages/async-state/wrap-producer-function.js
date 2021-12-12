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
      runningPromise = wrapGenerator(executionValue, asyncState, props);
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

// todo: do not return a promise if the generator finishes while synchronous
function wrapGenerator(generator, asyncState, props) {
  return new Promise((resolve, reject) => {
    const abortGenerator = stepAndContinueGenerator(generator, resolve, reject);
    props.onAbort(abortGenerator);
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
