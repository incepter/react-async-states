import { ASYNC_STATUS } from "./utils";
import { runPromiseState } from "./run-promise";

const defaultConfig = Object.freeze({
  lazy: true,
  forkable: true,
});

export function createInitialPromiseState(
  key,
  originalPromise,
  config = defaultConfig,
) {
  const promiseState = {
    config,

    key, // a unique identifier
    originalPromise, // the ready-to go promise

    oldState: undefined, // initially undefined, represents the latest fulfilled value
    currentState: {
      // the current state
      args: null,
      data: null,
      error: null,
      status: ASYNC_STATUS.initial,
    },

    subscriptions: {}, // subscribers
  };
  promiseState.run = function(...args) {
    return runPromiseState(promiseState, ...args);
  };
  return promiseState;
}
