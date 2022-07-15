import * as React from "react";
import {
  identity,
  isFn,
  shallowEqual
} from "shared";
import {AsyncStateContext} from "../context";
import {
  AsyncStateContextValue,
  AsyncStateSelector,
  EqualityFn, ManagerWatchCallbackValue,
} from "../types.internal";
import {isAsyncStateSource} from "../async-state/utils";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource
} from "../async-state";

type BaseSelectorKey = AsyncStateKey | AsyncStateSource<any>
type MultipleSelectorBaseKeys = BaseSelectorKey | BaseSelectorKey[]


export type SelectorV2KeysArg =
  MultipleSelectorBaseKeys
  | ((allKeys: AsyncStateKey[]) => MultipleSelectorBaseKeys)


export default function useSelectorV2<T>(
  keys: SelectorV2KeysArg,
  selector: AsyncStateSelector<T> = identity,
  areEqual: EqualityFn<T> = shallowEqual
): T {
  const contextValue = React.useContext(AsyncStateContext);
  const isInsideProvider = contextValue !== null;

  if (!isInsideProvider && isFn(keys)) {
    throw new Error('useSelector keys is passed as a function which is not supported outside the provider.')
  }

  const keysToWatch = readKeys(keys, contextValue);

  if (keysToWatch.length === 0) {
    throw new Error("useSelector cannot have 0 keys to watch.");
  }

  const asyncStates: Record<AsyncStateKey, AsyncStateInterface<any> | undefined> = keysToWatch
    .reduce((result, current) => {
      if (isAsyncStateSource(current)) {
        const asyncState = readAsyncStateFromSource(current);
        result[asyncState.key] = asyncState;
      } else if (isInsideProvider) {
        result[current] = contextValue.get(current);
      } else {
        result[current] = undefined;
      }
      return result;
    }, {});

  const reduceToObject = isFn(keys);

  const selectorStates = Object.entries(asyncStates)
    .map(([key, as]) => ({
      ...as?.currentState,
      key,
      cache: as?.cache,
      lastSuccess: as?.lastSuccess
    }));

  const selectorParam = reduceToObject ? selectorStates.reduce((result, current) => {
    result[current.key] = current;
    return result;
  }, {}) : selectorStates;

  if (isInsideProvider) {
    React.useEffect(() => {
      function onChange(
        value: ManagerWatchCallbackValue<T>,
        notificationKey: AsyncStateKey
      ) {
        // todo: if keys is a function, this may be a candidate
        if (asyncStates.hasOwnProperty(notificationKey) && asyncStates[notificationKey] !== value) {
          // perform a recalculation
        }
      }
      contextValue.watchAll(onChange)
    });
  }

  React.useEffect(() => {
    const unsubscribeFns = Object
      .values(asyncStates)
      .filter(Boolean)
      .map(as => as?.subscribe(function onUpdate() {
        // recalculate resulting state
      }));
    return () => {
      unsubscribeFns.forEach((cleanup => cleanup?.()));
    }
  });


  return selector(selectorParam);

}

function readKeys(keys: SelectorV2KeysArg, ctx: AsyncStateContextValue | null) {
  if (typeof keys === "function") {
    const availableKeys = ctx !== null ? ctx.getAllKeys() : [];
    return readKeys(keys(availableKeys), ctx);
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  return [keys];
}
