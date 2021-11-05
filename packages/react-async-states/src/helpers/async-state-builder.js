import { createReducerProducer } from "./create-producer";

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
  builder.producer = curryPropOfOutput("producer");
  builder.initialValue = curryPropOfOutput("initialValue");
  builder.build = function build() {
    return output;
  }
  return builder;
}

export function createAsyncState(key, producer, initialValue) {
  return AsyncStateBuilder()
    .key(key)
    .producer(producer)
    .initialValue(initialValue)
    .build();
}

export function createReducerAsyncState(key, reducer, initialValue) {
  return createAsyncState(key, createReducerProducer(reducer), initialValue)
}
