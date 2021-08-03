export function createReducerPromise(reducerFn) {
  if (typeof reducerFn !== "function") {
    throw new Error(`Reducer Promise creator expects reducerFn to be a function, received ${typeof reducerFn}`);
  }
  return function reducer(argv) {
    return reducerFn(argv.lastSuccess, ...argv.executionArgs);
  }
}
