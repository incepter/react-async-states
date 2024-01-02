import * as React from "react";
import { Context } from "../provider/context";
import { parseConfig } from "./modules/HookResolveConfig";
import { LegacyHookReturn, MixedConfig, PartialUseAsyncConfig } from "./types";
import { useRetainInstance } from "./modules/HookSubscription";
import {
  autoRunAndSubscribeEvents,
  commit,
} from "./modules/HookSubscriptionCommit";
import { beginRender } from "./modules/HookSubscriptionRender";

// this is the main hook, useAsyncState previously
export function useAsync_internal<TData, TArgs extends unknown[], TError, S>(
  options: MixedConfig<TData, TArgs, TError, S>,
  deps: unknown[],
  overrides?: PartialUseAsyncConfig<TData, TArgs, TError, S> | null
): LegacyHookReturn<TData, TArgs, TError, S> {
  // only parse the configuration when deps change
  // this process will yield the instance to subscribe to, along with
  // the combined config (options)
  let currentContext = React.useContext(Context);
  let { instance, config } = React.useMemo(
    () => parseConfig(currentContext, options, overrides),
    deps
  );

  // here, we will create a subscription from this component
  // to this state instance. refer to HookSubscription type.
  let subscription = useRetainInstance(instance, config, deps);
  // the alternate is similar to React alternate object that's
  // created for every render and every fiber. It represents the
  // work in progress essential information that will be flushed
  // at the commit phase. It is important not to touch anything during
  // render and port everything to the commit phase.
  // a "null" alternate means that the render was bailed out.
  let alternate = beginRender(subscription, config, deps);
  // this first effect will flush the alternate's properties inside
  // the subscription, such as the current return, the parsed config...
  // it is important to perform this work every time the alternate changes.
  // if your state changes often, this effect may be executed everytime.
  React.useLayoutEffect(() => commit(subscription, alternate), [alternate]);
  // this second effect which is governed by the user's dependencies will:
  // - subscribe to the state instance for changes
  // - invoke onSubscribe events
  // - run the state instance
  React.useLayoutEffect(() => autoRunAndSubscribeEvents(subscription), deps);

  // the alternate may be null when we render the first time or when we bail out
  // the render afterward.
  // the returned priority is obviously for the alternate
  let returnedSubscription = alternate ?? subscription;

  return returnedSubscription.return;
}
