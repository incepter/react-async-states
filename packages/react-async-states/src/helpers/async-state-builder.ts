import {AsyncStateBuilderFunction, AsyncStateInitializer} from "../types";

export function AsyncStateBuilder<T>(): AsyncStateBuilderFunction<T> {
  let output: AsyncStateInitializer<T> = {};

  function curryPropOfOutput(prop: "key" | "config" | "producer") {
    return function setPropAndReturnBuilder(value) {
      output[prop] = value;
      return builder;
    }
  }

  const builder: AsyncStateBuilderFunction<T> = {
    key: curryPropOfOutput("key"),
    config: curryPropOfOutput("config"),
    producer: curryPropOfOutput("producer"),
    build: function build() {
    return output;
  }
  };



  return builder;
}
