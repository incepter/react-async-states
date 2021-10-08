import AsyncState from "async-state";

export const createSourceAsyncState = function createSourceAsyncState(key, promise, config) {
  return new AsyncState(key, promise, config)._source;
}
