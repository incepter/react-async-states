import * as React from "react";
import {
	CleanupFn,
	HookChangeEvents,
	HookChangeEventsFunction,
	HookSubscription,
	PartialUseAsyncStateConfiguration,
	SubscribeEventProps,
	SubscriptionAlternate,
	UseAsyncStateEventFn,
	UseAsyncStateEventSubscribe,
	UseAsyncStateEventSubscribeFunction,
} from "../types";
import {
	createSubscriptionLegacyReturn,
	selectWholeState,
} from "./HookReturnValue";
import { __DEV__, isArray, isFunction } from "../../shared";
import { AbortFn, State, StateInterface } from "async-states";

export function useRetainInstance<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>,
	deps: unknown[]
): HookSubscription<T, E, A, S> {
	// ⚠️⚠️⚠️
	// the subscription will be constructed fully in the first time (per instance)
	// then we will update its properties through the alternate after rendering
	// so basically, we won't care about any dependency array except the instance
	// itself. Because all the other information will be held by the alternate.
	// so, sorry typescript and all readers 🙂
	let [, forceUpdate] = React.useState(0);
	return React.useMemo(
		() => createSubscription(instance, forceUpdate, config, deps),
		[instance]
	);
}

type SubscriptionWithoutReturn<T, E, A extends unknown[], S> = Omit<
	HookSubscription<T, E, A, S>,
	"return"
>;

function createSubscription<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	update: React.Dispatch<React.SetStateAction<number>>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>,
	deps: unknown[]
) {
	// these properties are to store the single onChange or onSubscribe
	// events (a single variable, but may be an array)
	// and every time you call onChange it overrides this value
	// sure, it receives the previous events as argument if function
	let changeEvents: HookChangeEvents<T, E, A> | undefined = undefined;
	let subscribeEvents: UseAsyncStateEventSubscribe<T, E, A> | undefined =
		undefined;

	let subscriptionWithoutReturn: SubscriptionWithoutReturn<T, E, A, S> = {
		deps,
		config,
		update,
		instance,
		version: instance.version,

		read,
		onChange,
		onSubscribe,
		alternate: null,

		// used in dev mode
		at: currentlyRenderingComponentName,
	};

	let subscription = subscriptionWithoutReturn as HookSubscription<T, E, A, S>;
	subscription.return = createSubscriptionLegacyReturn(subscription, config);

	return subscription;

	function read(suspend?: boolean, throwError?: boolean): S {
		let alternate = subscription.alternate;
		let currentReturn = alternate ? alternate.return : subscription.return;

		if (!config.concurrent) {
			config.concurrent = true;
		}

		if (suspend) {
			let currentStatus = instance.state.status;
			if (currentStatus === "initial") {
				let shouldRun = shouldRunSubscription(instance, config);
				if (shouldRun) {
					let runArgs = (config.autoRunArgs || []) as A;
					let promise = instance.actions.runp.apply(null, runArgs);
					if (promise) {
						throw promise;
					}
				}
			} else if (currentStatus === "pending") {
				throw instance.promise!;
			}
		}
		if (throwError && currentReturn.isError) {
			throw currentReturn.error;
		}

		return currentReturn.state;
	}

	function onChange(
		newEvents: HookChangeEventsFunction<T, E, A> | HookChangeEvents<T, E, A>
	) {
		if (isFunction(newEvents)) {
			let events = newEvents as HookChangeEventsFunction<T, E, A>;
			let maybeEvents = events(changeEvents);
			if (maybeEvents) {
				changeEvents = maybeEvents;
			}
		} else if (newEvents) {
			changeEvents = newEvents as HookChangeEvents<T, E, A>;
		}
	}

	function onSubscribe(
		newEvents:
			| ((prevEvents?: UseAsyncStateEventSubscribe<T, E, A>) => void)
			| UseAsyncStateEventSubscribe<T, E, A>
	) {
		if (isFunction(newEvents)) {
			let events = newEvents as UseAsyncStateEventSubscribeFunction<T, E, A>;
			let maybeEvents = events(subscribeEvents);
			if (maybeEvents) {
				subscribeEvents = maybeEvents;
			}
		} else if (newEvents) {
			subscribeEvents = newEvents as UseAsyncStateEventSubscribe<T, E, A>;
		}
	}
}

export function beginRenderSubscription<T, E, A extends unknown[], S>(
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
			completeRenderSubscription(subscription);
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
	subscription.alternate = alternate;
	// at this point, we have a defined alternate. Let's perform a render

	// first thing to do, is to verify the optimistic lock
	if (alternate.version !== instance.version) {
		// this means that the instance received an update in between, so we need
		// to change the returned value
		alternate.version = instance.version;
		alternate.return = createSubscriptionLegacyReturn(subscription, newConfig);
		// no need to check anything else since this is a fresh value

		completeRenderSubscription(subscription);
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
			alternate.return = createSubscriptionLegacyReturn(
				subscription,
				newConfig
			);
		}
	}

	completeRenderSubscription(subscription);
	return alternate;
}

export function completeRenderSubscription<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>
): void {
	if (__DEV__) {
		__DEV__unsetHookCallerName();
	}
	let { config, alternate } = subscription;
	let usedReturn = (alternate || subscription).return;

	if (config.concurrent) {
		usedReturn.read(true, false);
	}
}

export function commit<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	pendingAlternate: SubscriptionAlternate<T, E, A, S> | null
) {
	// here, we commit the alternate
	Object.assign(subscription, pendingAlternate);
	if (subscription.alternate === pendingAlternate) {
		subscription.alternate = null;
	}

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

function resolveSubscriptionKey<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>
) {
	let key = subscription.config.subscriptionKey || subscription.at || undefined;

	return `${key}-${(subscription.instance.subsIndex || 0) + 1}`;
}

export function autoRunAndSubscribeEvents<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>
) {
	let currentConfig = subscription.config;
	let currentInstance = subscription.instance;
	let instanceActions = currentInstance.actions;

	// we capture this state here to test it against updates in a fast way
	let committedState = currentInstance.state;
	// perform the subscription to the instance here
	let onStateChangeCallback = onStateChange<T, E, A, S>;
	let subscriptionKey = __DEV__
		? resolveSubscriptionKey(subscription)
		: undefined;

	let unsubscribeFromInstance = instanceActions.subscribe({
		key: subscriptionKey,
		cb: onStateChangeCallback.bind(null, subscription, committedState),
	});

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

	// now, we will run the subscription. In order to run, all these conditions
	// should be met:
	// 1. lazy = false in the configuration
	// 2. condition() is true
	// 3. dependencies did change
	// 4. concurrent isn't enabled (it will run on render)
	let shouldRun = shouldRunSubscription(currentInstance, currentConfig);

	if (shouldRun && !currentConfig.concurrent) {
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

function onStateChange<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	committedState: State<T, E, A>,
	newState: State<T, E, A>
) {
	let currentReturn = subscription.return;
	let currentConfig = subscription.config;
	let currentInstance = subscription.instance;

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

	// when showing optimistic pending state and then a state change occurs
	// with a pending status and the difference in version is 1, then we will
	// bail out.
	let isShowingOptimistic =
		currentInstance.state.status !== "pending" && currentReturn.isPending;

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
	}
}

function shouldRunSubscription<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
) {
	if (config.lazy === false) {
		let condition = config.condition;
		if (condition === undefined || condition) {
			return true;
		} else if (isFunction(condition)) {
			let autoRunArgs = (config.autoRunArgs || []) as A;
			return condition(
				instance.state,
				autoRunArgs,
				instance.actions.getPayload()
			);
		}
	}

	return false;
}

export function forceComponentUpdate(prev: number) {
	return prev + 1;
}

export function invokeChangeEvents<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	events: UseAsyncStateEventFn<T, E, A> | UseAsyncStateEventFn<T, E, A>[]
) {
	let nextState = instance.state;
	const changeHandlers: UseAsyncStateEventFn<T, E, A>[] = isArray(events)
		? events
		: [events];

	const eventProps = { state: nextState, source: instance.actions };

	changeHandlers.forEach((event) => {
		if (typeof event === "object") {
			const { handler, status } = event;
			if (!status || nextState.status === status) {
				handler(eventProps);
			}
		} else {
			event(eventProps);
		}
	});
}

export function invokeSubscribeEvents<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	events: UseAsyncStateEventSubscribe<T, E, A> | undefined
): CleanupFn[] | null {
	if (!events || !instance) {
		return null;
	}

	let eventProps: SubscribeEventProps<T, E, A> = instance.actions;

	let handlers: ((props: SubscribeEventProps<T, E, A>) => CleanupFn)[] =
		isArray(events) ? events : [events];

	return handlers.map((handler) => handler(eventProps));
}

// dev mode helpers
let currentlyRenderingComponentName: string | null = null;
export function __DEV__setHookCallerName(name: string | undefined) {
	if (name) {
		currentlyRenderingComponentName = name;
	}
}

export function __DEV__unsetHookCallerName() {
	currentlyRenderingComponentName = null;
}
