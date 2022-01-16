import {readProducerConfigFromSubscriptionConfig} from "shared";
import AsyncState, {AsyncStateInterface, AsyncStateSource} from "async-state";
import {isAsyncStateSource} from "async-state/AsyncState";
import {readAsyncStateFromSource} from "async-state/utils";
import {
  AsyncStateEntries,
  AsyncStateEntry,
  ExtendedInitialAsyncState,
  InitialAsyncState
} from "../../types.internal";

export function createAsyncStateEntry<T>(
  asyncState: AsyncStateInterface<T>
): AsyncStateEntry<T> {
  return {value: asyncState};
}


export function createInitialAsyncStatesReducer(
  result: AsyncStateEntries,
  current: ExtendedInitialAsyncState<any>
) {
  if (isAsyncStateSource(current)) {
    const key = current.key;
    const existingEntry = result[key];
    const asyncState = readAsyncStateFromSource(
      current as AsyncStateSource<any>);

    if (!existingEntry || asyncState !== existingEntry.value) {
      result[key] = createAsyncStateEntry(asyncState);
      result[key].initiallyHoisted = true;
    }

    return result;
  } else {
    const {key, producer, config} = current as InitialAsyncState<any>;
    const initialValue = config?.initialValue;
    const existingEntry = result[key];
    if (existingEntry) {
      const asyncState = existingEntry.value;
      if (
        asyncState.originalProducer === producer &&
        asyncState.config.initialValue === initialValue
      ) {
        return result;
      }
    }
    result[key] = createAsyncStateEntry(
      new AsyncState(
        key,
        producer,
        readProducerConfigFromSubscriptionConfig(current)
      )
    );
    result[key].initiallyHoisted = true;
    return result;
  }

}
