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

  const asMap = React.useMemo(function deduceKeys() {
    return readSelectorKeys(keys, getAllKeys())
      .reduce((result, key) => {
        result[key] = get(key) || null;
        return result;
      }, {});
  }, [keys, getAllKeys]);

  const dependencies = React.useMemo(function getEffectDependencies() {
    return [...Object.keys(asMap), watchAll, dispose, selector]
  }, [asMap, watchAll, dispose, selector]);

  const [returnValue, setReturnValue] = React.useState(function getInitialState() {
    return selectValues() || initialValue;
  });

  function selectValues() {
    const reduceToObject = typeof keys === "function";

    let selectedValue;
    if (reduceToObject) {
      selectedValue = selector(
        Object.entries(asMap).reduce((result, [key, as]) => {
          result[key] = as?.currentState;
          return result;
        }, {})
      );
    } else {
      selectedValue = selector(Object.values(asMap).map(t => t?.currentState))
    }

    if (!areEqual(returnValue, selectedValue)) {
      return selectedValue;
    }
    return returnValue;
  }

  React.useLayoutEffect(function watchAndSubscribeAndCleanOldSubscriptions() {
    let cleanups = [];

    function subscription() {
      setReturnValue(selectValues());
    }

    Object.values(asMap).forEach(function subscribeOrWaitFor(asyncState) {
      if (asyncState) {
        cleanups.push(asyncState.subscribe(subscription));
        cleanups.push(function disposeAs() {
          dispose(asyncState)
        });
      }
    });

    cleanups.push(watchAll(function onSomethingHoisted(asyncState, notificationKey) {
      if (asMap[notificationKey] || asMap[notificationKey] === undefined) {
        return;
      }
      // appearance
      if (asyncState && asMap[notificationKey] === null) {
        asMap[notificationKey] = asyncState;
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
