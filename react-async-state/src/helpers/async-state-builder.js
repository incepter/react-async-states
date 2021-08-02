import { createReducerPromise } from "./create-promise";

export function AsyncStateBuilder() {
  let source = {lazy: true, initialValue: null};
  function apply(output, prop) {
    return function rest(value) {
      output[prop] = value;
      return returnValue;
    }
  }

  const returnValue = {};
  returnValue.key = apply(source, "key");
  returnValue.lazy = apply(source, "lazy");
  returnValue.promise = apply(source, "promise");
  returnValue.initialValue = apply(source, "initialValue");
  returnValue.build = function build() {
    return source;
  }
  return returnValue;
}

export function createAsyncState(key, promise, initialValue, lazy = true) {
  return AsyncStateBuilder()
    .key(key)
    .lazy(lazy)
    .promise(promise)
    .initialValue(initialValue)
    .build();
}

export function createReducerAsyncState(key, reducer, initialValue, lazy) {
  return createAsyncState(key, createReducerPromise(reducer), initialValue, lazy)
}
