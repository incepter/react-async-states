import { createReducerPromise } from "./create-promise";

export function AsyncStateBuilder() {
  let output = {initialValue: null};

  function curryPropOfOutput(prop) {
    return function setPropAndReturnBuilder(value) {
      output[prop] = value;
      return builder;
    }
  }

  const builder = {};
  builder.key = curryPropOfOutput("key");
  builder.promise = curryPropOfOutput("promise");
  builder.initialValue = curryPropOfOutput("initialValue");
  builder.build = function build() {
    return output;
  }
  return builder;
}

export function createAsyncState(key, promise, initialValue) {
  return AsyncStateBuilder()
    .key(key)
    .promise(promise)
    .initialValue(initialValue)
    .build();
}

export function createReducerAsyncState(key, reducer, initialValue) {
  return createAsyncState(key, createReducerPromise(reducer), initialValue)
}
