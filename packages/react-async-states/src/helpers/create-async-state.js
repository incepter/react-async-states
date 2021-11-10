import AsyncState from "async-state";

export const createSourceAsyncState = function createSourceAsyncState(key, producer, config) {
  return new AsyncState(key, producer, config)._source;
}
