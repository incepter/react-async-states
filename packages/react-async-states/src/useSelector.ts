import * as React from "react";
import {StateContext} from "./context";
import {
  BaseSelectorKey,
  SelectorKeysArg,
  StateContextValue,
  UseSelectorFunctionKeys,
} from "./types.internal";
import {
  AbortFn,
  ArraySelector,
  FunctionSelector,
  FunctionSelectorItem,
  InstanceOrNull,
  isSource,
  ManagerInterface,
  readSource,
  SimpleSelector,
  Source,
  StateInterface
} from "async-states";
import {useCallerName} from "./helpers/useCallerName";
import {__DEV__, isFunction} from "./shared";

export function useSelector<T>(
  keys: BaseSelectorKey,
  selector?: SimpleSelector<any, any, any, T>,
): T
export function useSelector<T>(
  keys: BaseSelectorKey[],
  selector?: ArraySelector<T>,
): T
export function useSelector<T>(
  keys: UseSelectorFunctionKeys,
  selector?: FunctionSelector<T>,
): T
export function useSelector<T>(
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
  selector: SimpleSelector<any, any, any, T> | ArraySelector<T> | FunctionSelector<T> = identity,
): T {
  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }
  let context = React.useContext(StateContext);

  ensureParamsAreOk(context, keys);

  let [guard, setGuard] = React.useState<number>(0);
  let keysArray = React
    .useMemo(() => readKeys(keys, context), [guard, keys, context]);
  let instances = React
    .useMemo(() => resolveInstances(keysArray, context), [keysArray]);

  let [state, setState] = React.useState<{value: T, guard: number}>(computeState);

  React.useEffect(
    () => subscribeAndWatch(context, keysArray, instances, onUpdate, setGuard, caller),
    [context, keysArray, instances]
  );

  if (state.guard !== guard) {
    onUpdate();
  }

  return state.value;

  function computeState() {
    return {value: selectValue(keys, selector, instances), guard};
  }

  function onUpdate() {
    setState({value: selectValue(keys, selector, instances), guard});
  }
}

function readKeys(
  keys: SelectorKeysArg,
  ctx: StateContextValue | null
): (string | Source<any, any, any>)[] {
  if (isFunction(keys)) {
    const availableKeys = ctx !== null ? ctx.getAllKeys() : [];
    return readKeys((keys as UseSelectorFunctionKeys)(availableKeys), ctx);
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  return [keys as string];
}


function identity<T>(): T {
  if (!arguments.length) {
    return undefined as T;
  }
  return (arguments.length === 1 ? arguments[0] : arguments) as T;
}

function ensureParamsAreOk<E>(
  contextValue: StateContextValue | null,
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
) {
  if (contextValue === null && isFunction(keys)) {
    throw new Error('useSelector function should be used inside provider');
  }
}

function resolveInstances(
  keysArray: (string | Source<any, any, any>)[],
  context: ManagerInterface | null
): Record<string, StateInterface<any, any, any> | undefined> {
  return keysArray.reduce((result, current) => {
    if (isSource(current)) {
      let source = current as Source<any, any, any>;
      result[source.key] = readSource(source);
    } else {
      let key = current as string;
      result[key] = context?.get(key);
    }
    return result;
  }, {} as Record<string, StateInterface<any, any, any> | undefined>);
}

function selectValue<T>(
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
  selector: SimpleSelector<any, any, any, T> | ArraySelector<T> | FunctionSelector<T>,
  instances: Record<string, StateInterface<any, any, any> | undefined>
): T {
  if (isFunction(keys)) {
    const selectorParam = Object.entries(instances)
      .reduce((result, [key, maybeInstance]) => {
        if (!maybeInstance) {
          result[key] = {key};
        } else {
          result[key] = Object.assign({
            key,
            cache: maybeInstance.cache,
            lastSuccess: maybeInstance.lastSuccess
          }, maybeInstance.state);
        }

        return result;
      }, {} as Record<string, FunctionSelectorItem<any, any, any>>);
    return (selector as FunctionSelector<T>)(selectorParam);
  }

  return (selector as ArraySelector<T>).apply(
    null,
    Object.entries(instances)
      .map(([key, maybeInstance]) => {
        if (!maybeInstance) {
          return {key};
        } else {
          return Object.assign({
            key,
            cache: maybeInstance.cache,
            lastSuccess: maybeInstance.lastSuccess
          }, maybeInstance.state);
        }
      })
  );
}

function subscribeAndWatch<T>(
  context: ManagerInterface | null,
  keysArray: (string | Source<any, any, any>)[],
  resolvedInstances: Record<string, StateInterface<any, any, any> | undefined>,
  onUpdate:  () => void,
  setGuard:  React.Dispatch<React.SetStateAction<number>>,
  caller?: string | undefined,
) {
  let unwatch: AbortFn = undefined;
  let subscriptionKey: string | undefined = undefined;
  if (__DEV__) {
    subscriptionKey = `${caller}-$4`;// 4: useSelector
  }

  if (context !== null) {
    unwatch = context.watchAll(function (
      value: InstanceOrNull<any, any, any>, key: string) {
      if (resolvedInstances.hasOwnProperty(key) && resolvedInstances[key] !== value) {
        setGuard(prev => prev + 1);
      }
    });
  }

  let unsubscribe = Object.entries(resolvedInstances)
    .map(([key, maybeInstance]) => maybeInstance?.subscribe({
      origin: 4,
      cb: onUpdate,
      flags: undefined,
      key: subscriptionKey,
    }));

  return function cleanup() {
    unwatch?.();
    unsubscribe.forEach(fn => fn?.());
  };

}
