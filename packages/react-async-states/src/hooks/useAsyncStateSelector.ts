import * as React from "react";
import {AsyncStateContext} from "../context";
import {identity, invokeIfPresent, shallowEqual} from "shared";
import {ArraySelector, AsyncStateSelector, AsyncStateSelectorKeys, FunctionSelector} from "../types";
import {AbortFn, AsyncStateInterface, AsyncStateKey} from "../../../async-state";
import useAsyncStateContext from "./useAsyncStateContext";

function readSelectorKeys(keys, availableKeys) {
  if (typeof keys === "string") {
    return [keys]; // optimize this
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  if (typeof keys === "function") {
    return readSelectorKeys(keys(availableKeys), availableKeys);
  }
  return [keys];
}

type SelectedAsyncStates = {
  [key: AsyncStateKey]: AsyncStateInterface<any>,
}

export function useAsyncStateSelector<T>
  (keys: AsyncStateSelectorKeys, selector: AsyncStateSelector<T> = identity, areEqual = shallowEqual, initialValue?: T) {

  const contextValue = useAsyncStateContext();
  const {get, dispose, getAllKeys, watchAll} = contextValue;

  const asyncStatesMap: SelectedAsyncStates = React.useMemo(function deduceKeys() {
    return readSelectorKeys(keys, getAllKeys())
      .reduce((result, key) => {
        result[key] = get(key) || null;
        return result;
      }, {});
  }, [keys, getAllKeys]);

  const dependencies = React.useMemo(function getEffectDependencies() {
    return [...Object.keys(asyncStatesMap), watchAll, dispose, selector]
  }, [asyncStatesMap, watchAll, dispose, selector]);

  const [returnValue, setReturnValue] = React.useState(function getInitialState() {
    return selectValues() || initialValue;
  });

  function selectValues() {
    const reduceToObject = typeof keys === "function";

    let selectedValue;

    // ?. optional channing is used bellow because the async state may be undefined (not hoisted yet)
    if (reduceToObject) {
      selectedValue = (selector as FunctionSelector<T>)(
        Object.entries(asyncStatesMap).reduce((result, [key, asyncState]) => {
          result[key] = Object.assign({lastSuccess: asyncState?.lastSuccess}, asyncState?.currentState);
          return result;
        }, {})
      );
    } else {
      selectedValue = (selector as ArraySelector<T>)(...Object.values(asyncStatesMap)
        .map(t => Object.assign({lastSuccess: t?.lastSuccess}, t?.currentState)))
    }

    if (!areEqual(returnValue, selectedValue)) {
      return selectedValue;
    }
    return returnValue;
  }

  React.useEffect(function watchAndSubscribeAndCleanOldSubscriptions() {
    let cleanups: AbortFn[] = [];

    function subscription() {
      setReturnValue(selectValues());
    }

    Object.values(asyncStatesMap).forEach(function subscribeOrWaitFor(asyncState) {
      if (asyncState) {
        cleanups.push(asyncState.subscribe(subscription));
        cleanups.push(function disposeAs() {
          dispose(asyncState)
        });
      }
    });

    cleanups.push(watchAll(function onSomethingHoisted(asyncState, notificationKey) {
      if (asyncStatesMap[notificationKey] || asyncStatesMap[notificationKey] === undefined) {
        return;
      }
      // appearance
      if (asyncState && asyncStatesMap[notificationKey] === null) {
        asyncStatesMap[notificationKey] = asyncState;
        cleanups.push(asyncState.subscribe(subscription));
        cleanups.push(function disposeAs() {
          dispose(asyncState)
        });
      }
      // disappearances should not occur because they are being watched from here
      setReturnValue(selectValues());
    }));

    return function invokeOldCleanups() {
      cleanups.forEach(invokeIfPresent);
    };
  }, dependencies);

  return returnValue;
}
