import { createReducerPromise } from "./create-promise";

export function AsyncStateBuilder() {
  let output = {lazy: true, initialValue: null};

  function curryPropOfOutput(prop) {
    return function setPropAndReturnBuilder(value) {
      output[prop] = value;
      return builder;
    }
  }

  const builder = {};
  builder.key = curryPropOfOutput("key");
  builder.lazy = curryPropOfOutput("lazy");
  builder.promise = curryPropOfOutput("promise");
  builder.initialValue = curryPropOfOutput("initialValue");
  builder.build = function build() {
    return output;
  }
  return builder;
}
//
// export function AsyncStateSubscriptionBuilder() {
//   let output = {
//     lazy: true,
//     fork: false,
//     promise: noop,
//     condition: true,
//     initialValue: null,
//     hoistToProvider: false,
//     rerenderStatus: defaultRerenderStatusConfig
//   };
//
//   function apply(output, prop) {
//     return function rest(value) {
//       output[prop] = value;
//       return builder;
//     }
//   }
//
//   const builder = {};
//   builder.key = apply(output, "key");
//   builder.lazy = apply(output, "lazy");
//   builder.fork = apply(output, "fork");
//   builder.promise = apply(output, "promise");
//   builder.condition = apply(output, "condition");
//   builder.forkConfig = apply(output, "forkConfig");
//   builder.initialValue = apply(output, "initialValue");
//   builder.hoistToProvider = apply(output, "hoistToProvider");
//   builder.hoistToProviderConfig = apply(output, "hoistToProviderConfig");
//   builder.build = function build() {
//     return output;
//   }
//   return builder;
// }

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
