import * as React from "react";
import {
	MixedConfig,
	PartialUseAsyncStateConfiguration,
	UseAsyncStateEventSubscribe,
	UseAsyncStateEventSubscribeFunction,
} from "../state-hook/types.internal";
import { HydrationContext } from "../hydration/context";
import { parseConfig } from "./modules/HookResolveConfig";
import {
	HookSubscription,
	LegacyHookReturn,
	SubscriptionAlternate,
} from "./types";
import { StateInterface } from "async-states";
import {
	createSubscriptionLegacyReturn,
	selectWholeState,
} from "./modules/HookReturnValue";
import { forceComponentUpdate } from "./modules/HookUpdate";
import { AbortFn, State } from "async-states/src";
import { isFunction } from "../shared";
import {
	HookChangeEvents,
	HookChangeEventsFunction,
	invokeChangeEvents,
	invokeSubscribeEvents,
} from "../state-hook/StateHook";
import {
	autoRunAndSubscribeEvents,
	commit,
	renderSubscription,
	useRetainInstance,
} from "./modules/HookSubscription";

// this is the main hook, useAsyncState previously
export function useAsync_internal<T, E, A extends unknown[], S>(
	options: MixedConfig<T, E, A, S>,
	deps: unknown[],
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): LegacyHookReturn<T, E, A, S> {
	let currentContext = React.useContext(HydrationContext);

	// only parse the configuration when deps change
	// this process will yield the instance to subscribe to, along with
	// the combined config (options)
	let { instance, config } = React.useMemo(
		() => parseConfig(currentContext, options, overrides),
		deps
	);

	let [, forceUpdate] = React.useState(0);
	let subscription = useRetainInstance(instance, forceUpdate, config, deps);

	// the alternate is created in theory every render.
	// a further optimization may prevent it from being created all the time
	let alternate = renderSubscription(subscription, config, deps);

	// this effect will be executed each time the state changes
	// it will flush the new render information
	React.useLayoutEffect(() => commit(subscription, alternate), [alternate]);

	// this effect will be executed everytime the dependencies change
	React.useLayoutEffect(() => autoRunAndSubscribeEvents(subscription), deps);

	let usedReturn = (alternate || subscription).return;

	if (config.concurrent) {
		usedReturn.read(true, false);
	}

	return usedReturn;
}
