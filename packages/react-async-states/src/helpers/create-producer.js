export function createReducerProducer(reducerFn) {
  if (typeof reducerFn !== "function") {
    throw new Error(`Reducer producer creator expects reducerFn to be a function, received ${typeof reducerFn}`);
  }
  return function reducer(argv) {
    return reducerFn(argv.lastSuccess.data, ...argv.args);
  }
}
