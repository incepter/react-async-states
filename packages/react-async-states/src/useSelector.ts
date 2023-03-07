import * as React from "react";
import {
  ArraySelector,
  BaseSelectorKey,
  FunctionSelector,
  FunctionSelectorItem,
  InstanceOrNull,
  SelectorKeysArg,
  SimpleSelector,
  UseSelectorFunctionKeys,
} from "./types.internal";
import {
  AbortFn,
  isSource,
  PoolInterface,
  readSource,
  Source,
  StateInterface
} from "async-states";
import {useCallerName} from "./helpers/useCallerName";
import {__DEV__, isFunction} from "./shared";
import {useExecutionContext} from "./hydration/context";

export function useSelector<T>(
  keys: BaseSelectorKey,
  selector?: SimpleSelector<unknown, unknown, unknown, unknown[], T>,
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
  selector: SimpleSelector<unknown, unknown, unknown, unknown[], T> | ArraySelector<T> | FunctionSelector<T> = identity,
): T {
  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }

  let executionContext = useExecutionContext();
  let pool = executionContext.getOrCreatePool();

  let [guard, setGuard] = React.useState<number>(0);
  let keysArray = React
    .useMemo(() => readKeys(keys, pool), [guard, keys, pool]);
  let instances = React
    .useMemo(() => resolveInstances(keysArray, pool), [keysArray]);

  let [state, setState] = React.useState<{ value: T, guard: number }>(computeState);

  React.useEffect(
    () => subscribeAndWatch(pool, keysArray, instances, onUpdate, setGuard, caller),
    [pool, keysArray, instances]
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
  pool: PoolInterface
): (string | Source<unknown, unknown, unknown, unknown[]>)[] {
  if (isFunction(keys)) {
    const availableKeys = pool.instances.keys();
    return readKeys((keys as UseSelectorFunctionKeys)(Array.from(availableKeys)), pool);
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

function resolveInstances(
  keysArray: (string | Source<unknown, unknown, unknown, unknown[]>)[],
  pool: PoolInterface
): Record<string, StateInterface<unknown, unknown, unknown, unknown[]> | undefined> {
  return keysArray.reduce((result, current) => {
    if (isSource(current)) {
      let source = current as Source<unknown, unknown, unknown, unknown[]>;
      result[source.key] = readSource(source);
    } else {
      let key = current as string;
      result[key] = pool.instances.get(key);
    }
    return result;
  }, {} as Record<string, StateInterface<unknown, unknown, unknown, unknown[]> | undefined>);
}

function selectValue<T>(
  keys: BaseSelectorKey | BaseSelectorKey[] | UseSelectorFunctionKeys,
  selector: SimpleSelector<unknown, unknown, unknown, unknown[], T> | ArraySelector<T> | FunctionSelector<T>,
  instances: Record<string, StateInterface<unknown, unknown, unknown, unknown[]> | undefined>
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
  pool: PoolInterface,
  keysArray: (string | Source<unknown, unknown, unknown, unknown[]>)[],
  resolvedInstances: Record<string, StateInterface<unknown, unknown, unknown, unknown[]> | undefined>,
  onUpdate: () => void,
  setGuard: React.Dispatch<React.SetStateAction<number>>,
  caller?: string | undefined,
) {
  let unwatch: AbortFn = undefined;
  let subscriptionKey: string | undefined = undefined;
  if (__DEV__) {
    subscriptionKey = `${caller}-$4`;// 4: useSelector
  }

  let resolvedEntries = Object.entries(resolvedInstances);
  let reResolvedInstances = Object.entries(resolveInstances(keysArray, pool));
  if (resolvedEntries.length !== reResolvedInstances.length) {
    setGuard(old => old + 1);
    return;
  }
  for (let i = 0, {length} = resolvedEntries; i < length; i+= 1) {
    if (resolvedEntries[i][1] !== reResolvedInstances[i][1]) {
      setGuard(old => old + 1);
      return;
    }
  }

  unwatch = pool.listen(function (
    value: InstanceOrNull<any>, key: string) {
    if (resolvedInstances.hasOwnProperty(key) && resolvedInstances[key] !== value) {
      setGuard(prev => prev + 1);
    }
  });

  let unsubscribe = resolvedEntries
    .map(([, maybeInstance]) => maybeInstance?.subscribe({
      cb: onUpdate,
      flags: undefined,
      key: subscriptionKey,
    }));

  return function cleanup() {
    unwatch?.();
    unsubscribe.forEach(fn => fn?.());
  };

}
