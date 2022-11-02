import * as React from "react";
import {__DEV__, shallowEqual} from "shared";
import {AsyncStateContext} from "./context";
import {
  ArraySelector,
  StateContextValue,
  BaseSelectorKey,
  EqualityFn,
  FunctionSelector,
  FunctionSelectorItem,
  ManagerWatchCallbackValue,
  SelectorKeysArg,
  SimpleSelector,
  UseSelectorFunctionKeys,
} from "../types.internal";
import {isAsyncStateSource} from "../async-state/utils";
import AsyncState, {
  StateInterface,
  Source,
} from "../async-state";
import {readAsyncStateFromSource} from "../async-state/AsyncState";
import {useCallerName} from "./helpers/useCallerName";

type SelectorSelf<T> = {
  currentValue: T,
  currentKeys: (string | Source<any>)[],
  currentInstances: Record<string, StateInterface<any> | undefined>,
}

// todo: enhance the typing of useSelector
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
  let caller;
  const contextValue = React.useContext(AsyncStateContext);
  const isInsideProvider = contextValue !== null;

  if (__DEV__) {
    caller = useCallerName(3);
  }

  ensureParamsAreOk(contextValue, keys, selector);

  // on every render, recheck the keys, because they are most likely to be inlined
  const [self, setSelf] = React.useState<SelectorSelf<T>>(computeSelf);

  // when the content of the keys array change, recalculate
  // const keysToWatch = readKeys(keys, contextValue);
  // if (didKeysChange(self.currentKeys, keysToWatch)) {
  //   setSelf(computeSelf());
  // }

  if (isInsideProvider) {
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
        setSelf(old => ({...old, currentValue: newValue}));
      }
    }

    const unsubscribeFns = Object
      .values(self.currentInstances)
      .filter(Boolean)
      .map(as => {
        let subscriptionKey: string | undefined = undefined;
        if (__DEV__) {
          let nextMeter = (as as AsyncState<any>).subsIndex;
          subscriptionKey = `${caller}-$4-$${nextMeter}`;// 4: useSelector
        }
        return as!.subscribe(onUpdate, subscriptionKey);
      });

    return () => {
      unsubscribeFns.forEach((cleanup => cleanup?.()));
    }
  }, [self.currentInstances, self.currentValue, areEqual]);

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
      .map(([key, as]) => ({
        ...as?.state,
        key,
        cache: as?.cache,
        lastSuccess: as?.lastSuccess
      }));

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
      return (selector as ArraySelector<T>)(...selectorStates);
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
  selector: SimpleSelector<any, E> | ArraySelector<E> | FunctionSelector<E>
) {
  if (contextValue === null && typeof keys === "function") {
    throw new Error('useSelector keys is passed as a function which is not supported outside the provider.')
  }
  if (typeof selector !== "function") {
    throw new Error(`useSelector's selector (second arg) is not a function: '${typeof selector}'`);
  }
}

function computeInstancesMap(
  contextValue: StateContextValue | null,
  fromKeys: (string | Source<any>)[]
): Record<string, StateInterface<any> | undefined> {
  return fromKeys
    .reduce((result, current) => {
      if (isAsyncStateSource(current)) {
        const asyncState = readAsyncStateFromSource(current as Source<any>);
        result[asyncState.key] = asyncState;
      } else if (contextValue !== null) {
        result[current as string] = contextValue.get(current as string);
      } else {
        result[current as string] = undefined;
      }
      return result;
    }, {});
}

function identity(...args: any[]): any {
  if (!args || !args.length) {
    return undefined;
  }
  return args.length === 1 ? args[0] : args;
}
