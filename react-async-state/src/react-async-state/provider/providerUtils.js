import AsyncState from "../../async-state/AsyncState";
import { callAsync } from "../utils/async";

export function createAsyncStateEntry(asyncState) {
  return {
    value: asyncState,
    scheduledRunsCount: -1,
  };
}

export function createInitialAsyncStatesReducer(result, current) {
  const {key, promise, config} = current;
  result[current.key] = createAsyncStateEntry(new AsyncState({key, promise, config}));
  result[current.key].initiallyHoisted = true;
  return result;
}

export function runScheduledAsyncState(asyncStateEntry) {
  if (asyncStateEntry.scheduledRunsCount === -1) {
    asyncStateEntry.scheduledRunsCount = 1; // first schedule
  } else {
    asyncStateEntry.scheduledRunsCount += 1; // increment schedules
  }

  let isCancelled = false;

  // unlock on cancel
  function cancel() {
    isCancelled = true;
    if (asyncStateEntry.scheduledRunsCount > 1) {
      asyncStateEntry.scheduledRunsCount -= 1;
    } else if (asyncStateEntry.scheduledRunsCount === 1) {
      asyncStateEntry.scheduledRunsCount = -1;
    }
  }

  function runner() {
    if (!isCancelled) {
      if (asyncStateEntry.scheduledRunsCount === 1) {
        asyncStateEntry.value.run();
        asyncStateEntry.scheduledRunsCount = -1;
      } else {
        asyncStateEntry.scheduledRunsCount -= 1;
      }
    }
  }

  callAsync(runner)();

  return cancel;
}
