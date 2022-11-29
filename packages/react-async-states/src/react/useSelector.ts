import * as React from "react";
import {AsyncStateContext} from "./context";
import {
  BaseSelectorKey,
  EqualityFn,
  SelectorKeysArg,
  StateContextValue,
  UseSelectorFunctionKeys,
} from "../types.internal";
import {isSource} from "../async-state/utils";
import {
  ManagerWatchCallbackValue,
  Source,
  StateInterface,
  ArraySelector,
  FunctionSelector,
  FunctionSelectorItem,
  SimpleSelector
} from "../async-state";
import {readSource} from "../async-state/AsyncState";
import {computeCallerName} from "./helpers/useCallerName";
import {__DEV__, shallowEqual} from "../shared";

type SelectorSelf<T> = {
  currentValue: T,
  currentKeys: (string | Source<any>)[],
  currentInstances: Record<string, StateInterface<any> | undefined>,
}

export function useSelector<T>(
  keys: BaseSelectorKey,
  selector?: SimpleSelector<any, T>,
  areEqual?: EqualityFn<T>
): T
export function useSelector<T>(
  keys: BaseSelectorKey[],
  selector?: ArraySelector<T>,
  areEqual?: EqualityFn<T>,
): T
export function useSelector<T>(
  keys: UseSelectorFunctionKeys,
  selector?: FunctionSelector<T>,
  areEqual?: EqualityFn<T>,
): T
export function useSelector<T>(
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
// @ts-ignore
  selector?: SimpleSelector<any, T> | ArraySelector<T> | FunctionSelector<T> = identity,
  areEqual?: EqualityFn<T> = shallowEqual,
): T {
  const contextValue = React.useContext(AsyncStateContext);

  ensureParamsAreOk(contextValue, keys);

  const [self, setSelf] = React.useState<SelectorSelf<T>>(computeSelf);

  // when the content of the keys array change, recalculate
  // const keysToWatch = readKeys(keys, contextValue);
  // if (didKeysChange(self.currentKeys, keysToWatch)) {
  //   setSelf(computeSelf());
  // }

  if (contextValue !== null) {
    React.useLayoutEffect(() => {
      function onChange(
        value: ManagerWatchCallbackValue<T>,
        notificationKey: string
      ) {

        // if we are interested in what happened, recalculate and quit
        if (
          self.currentInstances.hasOwnProperty(notificationKey) &&
          self.currentInstances[notificationKey] !== value
        ) {
          setSelf(computeSelf());
          return;
        }
        // re-attempt calculating keys if the given keys is a function:
        if (typeof keys === "function") {
          const newKeys = readKeys(keys, contextValue);
          if (didKeysChange(self.currentKeys, newKeys)) {
            setSelf(computeSelf());
          }
        }
      }

      return contextValue.watchAll(onChange);
    }, [contextValue, self.currentInstances, self.currentKeys, keys]);
  }

  // uses:
  //    - self.currentInstances
  //    - self.currentValue
  //    - areEqual
  //    - selector (readValue uses it)
  React.useEffect(() => {
    function onUpdate() {
      const newValue = readValue(self.currentInstances);
      if (!areEqual(self.currentValue, newValue)) {
        setSelf(old => Object.assign({}, old, {currentValue: newValue}));
      }
    }

    const unsubscribeFns = Object
      .values(self.currentInstances)
      .filter(Boolean)
      .map(as => {
        let subscriptionKey: string | undefined = undefined;
        if (__DEV__) {
          let caller = computeCallerName(8);
          subscriptionKey = `${caller}-$4`;// 4: useSelector
        }
        return (as as StateInterface<T>)!.subscribe({
          origin: 4,
          cb: onUpdate,
          flags: undefined,
          key: subscriptionKey,
        });
      });

    return () => {
      unsubscribeFns.forEach((cleanup => cleanup?.()));
    }
  }, [contextValue, self.currentInstances, self.currentValue, areEqual]);

  function computeSelf() {
    const currentKeys = readKeys(keys, contextValue);
    const currentInstances = computeInstancesMap(contextValue, currentKeys);
    const currentValue = readValue(currentInstances);
    return {
      currentKeys,
      currentValue,
      currentInstances,
    };
  }

  // uses: selector
  function readValue(instances: Record<string, StateInterface<any> | undefined>) {
    const selectorStates = Object.entries(instances)
      .map(([key, as]) => {
        return Object.assign({}, as?.state, {
          key,
          cache: as?.cache,
          lastSuccess: as?.lastSuccess
        });
      });

    if (typeof keys === "function") {
      const selectorParam: Record<string, FunctionSelectorItem<any>> = selectorStates
        .reduce((
          result, current) => {
          result[current.key] = current;
          return result;
        }, {});
      return (selector as FunctionSelector<T>)(selectorParam);
    }

    if (Array.isArray(keys)) {
      return (selector as ArraySelector<T>).apply(null, selectorStates);
    }

    return (selector as SimpleSelector<any, T>)(selectorStates[0]);
  }

  return self.currentValue;
}

function didKeysChange(
  oldKeys: (string | Source<any>)[],
  newKeys: (string | Source<any>)[]
): boolean {
  if (oldKeys.length !== newKeys.length) {
    return true;
  }
  for (let i = 0; i < oldKeys.length; i++) {
    if (oldKeys[i] !== newKeys[i]) {
      return true;
    }
  }
  return false;
}

function readKeys(
  keys: SelectorKeysArg,
  ctx: StateContextValue | null
): (string | Source<any>)[] {
  if (typeof keys === "function") {
    const availableKeys = ctx !== null ? ctx.getAllKeys() : [];
    return readKeys(keys(availableKeys), ctx);
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  return [keys];
}

function ensureParamsAreOk<E>(
  contextValue: StateContextValue | null,
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
) {
  if (contextValue === null && typeof keys === "function") {
    throw new Error('useSelector function as keys outside provider');
  }
}

function computeInstancesMap(
  contextValue: StateContextValue | null,
  fromKeys: (string | Source<any>)[]
): Record<string, StateInterface<any> | undefined> {
  return fromKeys
    .reduce((result, current) => {
      if (isSource(current)) {
        const asyncState = readSource(current as Source<any>);
        result[asyncState.key] = asyncState;
      } else if (contextValue !== null) {
        result[current as string] = contextValue.get(current as string);
      } else {
        result[current as string] = undefined;
      }
      return result;
    }, {});
}

function identity(): any {
  if (!arguments.length) {
    return undefined;
  }
  return arguments.length === 1 ? arguments[0] : arguments;
}
