import * as React from "react";
import {
	MixedConfig,
	PartialUseAsyncStateConfiguration,
} from "../state-hook/types.internal";
import { HydrationContext } from "../hydration/context";
import { parseConfig } from "./modules/HookResolveConfig";
import { LegacyHookReturn } from "./types";
import {
	autoRunAndSubscribeEvents,
	commit,
	beginRenderSubscription,
	useRetainInstance,
} from "./modules/HookSubscription";

// this is the main hook, useAsyncState previously
export function useAsync_internal<T, E, A extends unknown[], S>(
	options: MixedConfig<T, E, A, S>,
	deps: unknown[],
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): LegacyHookReturn<T, E, A, S> {
	// only parse the configuration when deps change
	// this process will yield the instance to subscribe to, along with
	// the combined config (options)
	let currentContext = React.useContext(HydrationContext);
	let { instance, config } = React.useMemo(
		() => parseConfig(currentContext, options, overrides),
		deps
	);

	let subscription = useRetainInstance(instance, config, deps);
	let alternate = beginRenderSubscription(subscription, config, deps);

	// this effect will be executed each time the state changes
	// it will flush the new render information
	React.useLayoutEffect(() => commit(subscription, alternate), [alternate]);
	// this effect will be executed everytime the dependencies change
	React.useLayoutEffect(() => autoRunAndSubscribeEvents(subscription), deps);

	return (alternate || subscription).return;
}
