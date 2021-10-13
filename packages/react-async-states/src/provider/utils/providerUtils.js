import { asyncify } from "shared";
import AsyncState from "async-state";
import { isAsyncStateSource } from "async-state/AsyncState";
import { readAsyncStateFromSource } from "async-state/utils";

export function createAsyncStateEntry(asyncState) {
  return {
    value: asyncState,
    scheduledRunsCount: 0,
  };
}

export function createInitialAsyncStatesReducer(result, current) {
  if (isAsyncStateSource(current)) {
    const existingEntry = result[current.key];
    const asyncState = readAsyncStateFromSource(current);

    if (!existingEntry || asyncState !== existingEntry.value) {
      result[current.key] = createAsyncStateEntry(asyncState);
      result[current.key].initiallyHoisted = true;
    }

    return result;
  } else {
    const {key, promise, initialValue} = current;
    const existingEntry = result[key];
    if (existingEntry) {
      const asyncState = existingEntry.value;
      if (asyncState.originalPromise === promise && asyncState.config.initialValue === initialValue) {
        return result;
      }
    }
    result[key] = createAsyncStateEntry(new AsyncState(key, promise, {initialValue}));
    result[key].initiallyHoisted = true;
    return result;
  }

}

export function runScheduledAsyncState(asyncStateEntry, ...args) {

  if (!asyncStateEntry) {
    return;
  }
  asyncStateEntry.scheduledRunsCount += 1; // increment schedules
  let isRunning = false;
  let isCancelled = false;

  function cancel() {
    if (isCancelled) {
      return;
    }
    isCancelled = true;
    let asyncState = asyncStateEntry.value;

    if (isRunning && !hasMultipleSubscriptions(asyncState)) {
      asyncState.abort();
    }

    if (asyncStateEntry.scheduledRunsCount >= 1) {
      asyncStateEntry.scheduledRunsCount -= 1;
    }
  }

  function runner() {
    if (!isCancelled) {
      if (asyncStateEntry.scheduledRunsCount === 1) {
        isRunning = true;
        asyncStateEntry.value.run(...args);
        asyncStateEntry.scheduledRunsCount = 0;
      } else {
        asyncStateEntry.scheduledRunsCount -= 1;
      }
    }
  }

  asyncify(runner)();

  return cancel;
}

function hasMultipleSubscriptions(asyncState) {
  return Object.keys(asyncState.subscriptions).length > 0;
}
