import * as React from "react";
import {
	MixedConfig,
	PartialUseAsyncStateConfiguration,
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
} from "./modules/HookReturn";
import { forceComponentUpdate } from "./modules/HookUpdate";
import { AbortFn, State } from "async-states/src";
import { isFunction } from "../shared";
import {
	invokeChangeEvents,
	invokeSubscribeEvents,
} from "../state-hook/StateHook";

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
	let didBailoutRender = alternate === null;

	// this effect will be executed each time the state changes
	// it will flush the new render information
	React.useLayoutEffect(() => commit(subscription, alternate), [alternate]);

	// this effect will be executed everytime the dependencies change
	React.useLayoutEffect(() => autoRunAndSubscribeEvents(subscription), deps);

	return didBailoutRender ? subscription.return : alternate!.return;
}

function useRetainInstance<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	update: React.Dispatch<React.SetStateAction<number>>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>,
	deps: unknown[]
) {
	// ⚠️⚠️⚠️
	// the subscription will be constructed fully in the first time (per instance)
	// then we will update its properties through the alternate after rendering
	// so basically, we won't care about any dependency array except the instance
	// itself. Because all the other information will be held by the alternate.
	// so, sorry typescript and all.
	let baseSubscription: HookSubscription<T, E, A, S> = React.useMemo(() => {
		return {
			deps,
			config,
			update,
			instance,
			version: instance.version,

			alternate: null,
			return: createSubscriptionLegacyReturn(instance, config),
		};
	}, [instance]);

	return baseSubscription;
}

function renderSubscription<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	newConfig: PartialUseAsyncStateConfiguration<T, E, A, S>,
	deps: unknown[]
): SubscriptionAlternate<T, E, A, S> | null {
	let instance = subscription.instance;

	if (newConfig === subscription.config) {
		// this means that the dependencies did not change and the same config
		// remains from the previous render (or this is the first render).
		// At this point, there is no need to create the alternate.
		// which will be equivalent to a render bailout. But we'll need to check
		// on the versions in case something bad happened.
		if (subscription.version === instance.version) {
			// null to bail out the render
			return null;
		}
	}

	let alternate = {
		deps,
		instance,
		config: newConfig,
		return: subscription.return,
		update: subscription.update,
		version: subscription.version,
	};
	// at this point, we have a defined alternate. Let's perform a render

	// first thing to do, is to verify the optimistic lock
	if (alternate.version !== instance.version) {
		// this means that the instance received an update in between, so we need
		// to change the returned value
		alternate.version = instance.version;
		alternate.return = createSubscriptionLegacyReturn(instance, newConfig);
		// no need to check anything else since this is a fresh value

		return alternate;
	}

	// next, we will check the selector function
	let pendingSelector = newConfig.selector || selectWholeState;

	if (pendingSelector !== subscription.config.selector) {
		let { cache, state, lastSuccess } = instance;
		let comparingFunction = newConfig.areEqual || Object.is;

		let newSelectedValue = pendingSelector(state, lastSuccess, cache);

		// this means that the selected value did change
		if (!comparingFunction(subscription.return.state, newSelectedValue)) {
			// todo: this will recalculate the selected state, make it not
			alternate.return = createSubscriptionLegacyReturn(instance, newConfig);
		}
	}

	return alternate;
}

function commit<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	pendingAlternate: SubscriptionAlternate<T, E, A, S> | null
) {
	// here, we commit the alternate
	Object.assign(subscription, pendingAlternate);

	// on commit, the first thing to do is to detect whether a state change
	// occurred before commit
	let version = subscription.version;
	let currentInstance = subscription.instance;

	let currentConfig = subscription.config;

	if (version !== currentInstance.version) {
		subscription.update(forceComponentUpdate);
		return;
	}

	let instanceActions = currentInstance.actions;

	// 📝 We can call this part the instance reconciliation
	// patch the given config and the new producer if provided and different
	// we might be able to iterate over properties and re-assign only the ones
	// that changed and are supported.
	instanceActions.patchConfig(currentConfig);
	if (currentConfig.payload) {
		instanceActions.mergePayload(currentConfig.payload);
	}

	let currentProducer = currentInstance.fn;
	let pendingProducer = currentConfig.producer;
	if (pendingProducer !== undefined && pendingProducer !== currentProducer) {
		instanceActions.replaceProducer(pendingProducer);
	}
}

// this will detect whether the returned value from the hook doesn't match
// the new state's status.
function doesStateMismatchSubscriptionReturn(
	newState: State<any, any, any>,
	subscriptionReturn: HookSubscription<any, any, any, any>["return"]
) {
	switch (newState.status) {
		case "initial": {
			return !subscriptionReturn.isInitial;
		}
		case "pending": {
			return !subscriptionReturn.isPending;
		}
		case "success": {
			return !subscriptionReturn.isSuccess;
		}
		case "error": {
			return !subscriptionReturn.isError;
		}
		default: {
			return false;
		}
	}
}

function autoRunAndSubscribeEvents<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>
) {
	let currentReturn = subscription.return;
	let currentConfig = subscription.config;
	let currentInstance = subscription.instance;
	let instanceActions = currentInstance.actions;

	// when showing optimistic pending state and then a state change occurs
	// with a pending status and the difference in version is 1, then we will
	// bail out.
	let isShowingOptimistic =
		currentInstance.state.status !== "pending" && currentReturn.isPending;

	// we capture this state here to test it against updates in a fast way
	let committedState = currentInstance.state;

	// let cleanups: ((() => void) | undefined)[] = [];
	// perform the subscription to the instance here
	let unsubscribeFromInstance = instanceActions.subscribe({
		cb(newState) {
			// the very first thing to do, is to invoke change events if relevant
			let changeEvents = currentConfig.events?.change;
			if (changeEvents) {
				invokeChangeEvents(currentInstance, changeEvents);
			}

			let actualVersion = currentInstance.version;
			let committedVersion = subscription.version;

			// when we detect that this state is mismatching what was rendered
			// then we need to force the render and computation
			if (doesStateMismatchSubscriptionReturn(newState, currentReturn)) {
				subscription.update(forceComponentUpdate);
				return;
			}

			// this will happen if we consume the latest cached state
			if (committedState === newState) {
				return;
			}

			// this is weird and will never happen
			if (actualVersion === committedVersion + 1 && isShowingOptimistic) {
				return;
			}

			// at this point, we have a new state, so we need to perform checks
			let comparingFunction = currentConfig.areEqual || Object.is;
			let currentSelector = currentConfig.selector || selectWholeState;

			let { cache, lastSuccess } = currentInstance;
			let newSelectedValue = currentSelector(newState, lastSuccess, cache);

			if (!comparingFunction(currentReturn.state, newSelectedValue)) {
				subscription.update(forceComponentUpdate);
			} else {
				// we would keep the same previous state, but we will upgrade all
				// closure variables used in this callback
				subscription.version = actualVersion;

				isShowingOptimistic =
					currentInstance.state.status !== "pending" && currentReturn.isPending;
			}
		},
	});

	// now, we will run the subscription. In order to run, all these conditions
	// should be met:
	// 1. lazy = false in the configuration
	// 2. condition() is true
	// 3. dependencies did change
	let shouldRun = false;

	if (currentConfig.lazy === false) {
		let condition = currentConfig.condition;
		if (condition === undefined || condition) {
			shouldRun = true;
		} else if (isFunction(condition)) {
			let autoRunArgs = (currentConfig.autoRunArgs || []) as A;
			shouldRun = condition(
				currentInstance.state,
				autoRunArgs,
				instanceActions.getPayload()
			);
		}
	}

	let cleanups: ((() => void) | undefined)[] = [unsubscribeFromInstance];

	let subscribeEvents = currentConfig.events?.subscribe;
	if (subscribeEvents) {
		let unsubscribeFromEvents = invokeSubscribeEvents(
			currentInstance,
			subscribeEvents
		);
		if (unsubscribeFromEvents) {
			cleanups = cleanups.concat(unsubscribeFromEvents);
		}
	}

	if (shouldRun) {
		let autoRunArgs = (currentConfig.autoRunArgs || []) as A;
		let thisRunAbort: AbortFn = currentInstance.actions.run.apply(
			null,
			autoRunArgs
		);

		// add this run abort to the cleanups to it is aborted automatically
		cleanups.push(thisRunAbort);
	}

	return function cleanup() {
		for (let fn of cleanups) {
			if (fn) {
				fn();
			}
		}
	};
}
