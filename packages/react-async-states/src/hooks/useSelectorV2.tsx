import * as React from "react";
import {EMPTY_ARRAY, identity, isFn, shallowEqual} from "shared";
import {AsyncStateContext} from "../context";
import {
  AsyncStateContextValue,
  EqualityFn,
  ManagerWatchCallbackValue,
} from "../types.internal";
import {isAsyncStateSource} from "../async-state/utils";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  CachedState,
  State
} from "../async-state";

type BaseSelectorKey = AsyncStateKey | AsyncStateSource<any>

type UseSelectorFunctionKeys = ((allKeys: AsyncStateKey[]) => BaseSelectorKey[]);

export type SelectorV2KeysArg =
  BaseSelectorKey
  | BaseSelectorKey[]
  | UseSelectorFunctionKeys

interface FunctionSelectorItem<T> extends Partial<State<T>> {
  key: AsyncStateKey,
  lastSuccess?: State<T>,
  cache?: Record<string, CachedState<T>>,
}

export type FunctionSelectorArgument = Record<AsyncStateKey, FunctionSelectorItem<any> | undefined>;

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;

export type SimpleSelector<T, E> = (props: FunctionSelectorItem<T> | undefined) => E;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any> | undefined)[]) => T;

type SelectorSelf<T> = {
  currentValue: T,
  currentKeys: (string | AsyncStateSource<any>)[],
  currentInstances: Record<AsyncStateKey, AsyncStateInterface<any> | undefined>,
}

function useSelectorV2<T>(
  keys: BaseSelectorKey,
  selector: SimpleSelector<any, T>,
  areEqual?: EqualityFn<T>
): T
function useSelectorV2<T>(
  keys: BaseSelectorKey[],
  selector: ArraySelector<T>,
  areEqual?: EqualityFn<T>,
): T
function useSelectorV2<T>(
  keys: UseSelectorFunctionKeys,
  selector: FunctionSelector<T>,
  areEqual?: EqualityFn<T>,
): T
function useSelectorV2<T>(
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
  selector: SimpleSelector<any, T> | ArraySelector<T> | FunctionSelector<T> = identity,
  areEqual: EqualityFn<T> = shallowEqual,
): T {
  const contextValue = React.useContext(AsyncStateContext);
  const isInsideProvider = contextValue !== null;

  ensureParamsAreOk(contextValue, keys, selector);

  // on every render, recheck the keys, because they are most likely to be inlined
  const [self, setSelf] = React.useState<SelectorSelf<T>>(computeSelf);

  // when the content of the keys array change, recalculate
  // const keysToWatch = readKeys(keys, contextValue);
  // if (didKeysChange(self.currentKeys, keysToWatch)) {
  //   setSelf(computeSelf());
  // }

  if (isInsideProvider) {
    React.useEffect(() => {
      function onChange(
        value: ManagerWatchCallbackValue<T>,
        notificationKey: AsyncStateKey
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
        if (isFn(keys)) {
          const newKeys = readKeys(keys, contextValue);
          if (didKeysChange(self.currentKeys, newKeys)) {
            setSelf(computeSelf());
          }
        }
      }

      return contextValue.watchAll(onChange);
    });
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
      .map(as => as?.subscribe(onUpdate));

    return () => {
      unsubscribeFns.forEach((cleanup => cleanup?.()));
    }
  });

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
  function readValue(instances: Record<AsyncStateKey, AsyncStateInterface<any> | undefined>) {
    const selectorStates = Object.entries(instances)
      .map(([key, as]) => ({
        ...as?.currentState,
        key,
        cache: as?.cache,
        lastSuccess: as?.lastSuccess
      }));

    if (isFn(keys)) {
      const selectorParam: Record<AsyncStateKey, FunctionSelectorItem<any>> = selectorStates
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
  oldKeys: (AsyncStateKey | AsyncStateSource<any>)[],
  newKeys: (AsyncStateKey | AsyncStateSource<any>)[]
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
  keys: SelectorV2KeysArg,
  ctx: AsyncStateContextValue | null
): (AsyncStateKey | AsyncStateSource<any>)[] {
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
  contextValue: AsyncStateContextValue | null,
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
  selector: SimpleSelector<any, E> | ArraySelector<E> | FunctionSelector<E>
) {
  if (contextValue === null && isFn(keys)) {
    throw new Error('useSelector keys is passed as a function which is not supported outside the provider.')
  }
  if (!isFn(selector)) {
    throw new Error(`useSelector's selector (second arg) is not a function: '${typeof selector}'`);
  }
}

function computeInstancesMap(
  contextValue: AsyncStateContextValue | null,
  fromKeys: (string | AsyncStateSource<any>)[]
): Record<AsyncStateKey, AsyncStateInterface<any> | undefined> {
  return fromKeys
    .reduce((result, current) => {
      if (isAsyncStateSource(current)) {
        const asyncState = readAsyncStateFromSource(current as AsyncStateSource<any>);
        result[asyncState.key] = asyncState;
      } else if (contextValue !== null) {
        result[current as AsyncStateKey] = contextValue.get(current as AsyncStateKey);
      } else {
        result[current as AsyncStateKey] = undefined;
      }
      return result;
    }, {});
}


export default useSelectorV2;
