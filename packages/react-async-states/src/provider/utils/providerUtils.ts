import {readAsyncStateConfigFromSubscriptionConfig} from "shared";
import AsyncState, {AsyncStateInterface, AsyncStateKey} from "async-state";
import {isAsyncStateSource} from "async-state/AsyncState";
import {readAsyncStateFromSource} from "async-state/utils";
import {AsyncStateEntry, InitialAsyncState} from "../../types";

export function createAsyncStateEntry<T>(asyncState: AsyncStateInterface<T>): AsyncStateEntry<T> {
  return {value: asyncState};
}


export function createInitialAsyncStatesReducer(result: { [id: AsyncStateKey]: AsyncStateEntry<any> }, current: InitialAsyncState<any>) {
  if (isAsyncStateSource(current)) {
    const key = current.key;
    const existingEntry = result[key];
    const asyncState = readAsyncStateFromSource(current);

    if (!existingEntry || asyncState !== existingEntry.value) {
      result[key] = createAsyncStateEntry(asyncState);
      result[key].initiallyHoisted = true;
    }

    return result;
  } else {
    const {key, producer, config: {initialValue}} = current;
    const existingEntry = result[key];
    if (existingEntry) {
      const asyncState = existingEntry.value;
      if (asyncState.originalProducer === producer && asyncState.config.initialValue === initialValue) {
        return result;
      }
    }
    result[key] = createAsyncStateEntry(
      new AsyncState(key, producer, readAsyncStateConfigFromSubscriptionConfig(current))
    );
    result[key].initiallyHoisted = true;
    return result;
  }

}
