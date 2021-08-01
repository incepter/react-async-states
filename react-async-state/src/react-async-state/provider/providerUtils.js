import AsyncState from "../../async-state/AsyncState";
import { callAsync } from "../utils/async";

export function createAsyncStateEntry(asyncState) {
  return {
    value: asyncState,
    scheduledRunsCount: 0,
  };
}

export function createInitialAsyncStatesReducer(result, current) {
  const {key, promise, promiseConfig} = current;
  result[current.key] = createAsyncStateEntry(new AsyncState(key, promise, promiseConfig));
  result[current.key].initiallyHoisted = true;
  return result;
}

export function runScheduledAsyncState(asyncStateEntry, ...executionArgs) {
  if (!asyncStateEntry) {
    return;
  }
  asyncStateEntry.scheduledRunsCount += 1; // increment schedules

  let isRunning = false;
  let isCancelled = false;

  // unlock on cancel
  function cancel() {
    if (isCancelled) {
      return;
    }

    isCancelled = true;

    let asyncState = asyncStateEntry?.value;
    if (isRunning && !hasMultipleSubscriptions(asyncState)) {
      asyncState.abort();
    }

    asyncStateEntry.scheduledRunsCount -= 1;
  }

  function runner() {
    if (!isCancelled) {
      if (asyncStateEntry.scheduledRunsCount === 1) {
        isRunning = true;
        asyncStateEntry.value.run(...executionArgs);
        asyncStateEntry.scheduledRunsCount = 0;
      } else {
        asyncStateEntry.scheduledRunsCount -= 1;
      }
    }
  }

  callAsync(runner)();

  return cancel;
}

function hasMultipleSubscriptions(asyncState) {
  return Object.keys(asyncState.subscriptions).length > 0;
}
