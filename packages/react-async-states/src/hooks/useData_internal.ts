import { MixedConfig, ModernHookReturn, PartialUseAsyncConfig } from "./types";
import { useAsync_internal } from "./useAsync_internal";
import { setCurrentHookOverrides } from "./modules/HookResolveConfig";

// missing point:
// initial return may have data as null (in a typing point of view)
// this point will be challenging to be addressed, it should be typed deep down
// to the Source itself and the StateInterface. which may be impossible
// think about that later. a data: null may be okay for now.
let concurrentOverrides: PartialUseAsyncConfig<any, any, any, any> = {
  concurrent: true,
  throwError: true,
};
export function useData_internal<TData, TArgs extends unknown[], TError, S>(
  options: MixedConfig<TData, TArgs, TError, S>,
  deps: unknown[],
  overrides?: PartialUseAsyncConfig<TData, TArgs, TError, S> | null
): ModernHookReturn<TData, TArgs, TError, S> {
  try {
    setCurrentHookOverrides(concurrentOverrides);
    // this will mimic useAsync and get its result
    let result = useAsync_internal(options, deps, overrides);

    // the result here is guaranteed to be either initial or success
    return result as ModernHookReturn<TData, TArgs, TError, S>;
  } finally {
    setCurrentHookOverrides(null);
  }
}
