import React from "react";
import { AsyncStateContext } from "../context";
import { identity, invokeIfPresent, shallowEqual } from "shared";

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

export function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  const {get, dispose, getAllKeys, watchAll} = React.useContext(AsyncStateContext);

  const asyncStatesMap = React.useMemo(function deduceKeys() {
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
      selectedValue = selector(
        Object.entries(asyncStatesMap).reduce((result, [key, asyncState]) => {
          result[key] = Object.assign({lastSuccess: asyncState?.lastSuccess}, asyncState?.currentState);
          return result;
        }, {})
      );
    } else {
      selectedValue = selector(...Object.values(asyncStatesMap)
        .map(t => Object.assign({lastSuccess: t?.lastSuccess}, t?.currentState)))
    }

    if (!areEqual(returnValue, selectedValue)) {
      return selectedValue;
    }
    return returnValue;
  }

  React.useEffect(function watchAndSubscribeAndCleanOldSubscriptions() {
    let cleanups = [];

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
