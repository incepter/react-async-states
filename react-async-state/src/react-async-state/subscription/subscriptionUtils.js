import { EMPTY_OBJECT, invokeIfPresent } from "../../utils";

export const defaultRerenderStatusConfig = Object.freeze({
  error: true,
  success: true,
  aborted: true,
  loading: true,
});

export function makeEmptyReturnValueForKey(key, contextValue) {
  const runAsyncState = contextValue ? contextValue.runAsyncState : undefined;
  return Object.freeze({key, state: Object.freeze({}), empty: true, runAsyncState});
}

export function makeReturnValueFromAsyncState(asyncState, contextValue) {
  return Object.freeze({
    key: asyncState.key,

    run: asyncState.run.bind(asyncState),
    abort: asyncState.abort.bind(asyncState),
    replaceState: asyncState.replaceState.bind(asyncState),
    runAsyncState: contextValue ? contextValue.runAsyncState : undefined,

    state: Object.freeze({...asyncState.currentState}),
    previousState: asyncState.previousState ? Object.freeze({...asyncState.previousState}) : undefined,
  });
}
