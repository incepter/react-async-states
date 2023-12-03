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

export function useRetainInstance<T, A extends unknown[], E, S>(
	instance: StateInterface<T, A, E>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>,
	deps: unknown[]
): HookSubscription<T, A, E, S> {
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

type SubscriptionWithoutReturn<T, A extends unknown[], E, S> = Omit<
	HookSubscription<T, A, E, S>,
	"return"
>;

function createSubscription<T, A extends unknown[], E, S>(
	instance: StateInterface<T, A, E>,
	update: React.Dispatch<React.SetStateAction<number>>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>,
	deps: unknown[]
) {
	// these properties are to store the single onChange or onSubscribe
	// events (a single variable, but may be an array)
	// and every time you call onChange it overrides this value
	// sure, it receives the previous events as argument if function
	let changeEvents: HookChangeEvents<T, A, E> | null = null;
	let subscribeEvents: UseAsyncStateEventSubscribe<T, A, E> | null = null;

	let subscriptionWithoutReturn: SubscriptionWithoutReturn<T, A, E, S> = {
		deps,
		config,
		update,
		instance,
		version: instance.version,

		read,
		onChange,
		onSubscribe,
		alternate: null,

		changeEvents,
		subscribeEvents,

		// used in dev mode
		at: currentlyRenderingComponentName,
	};

	let subscription = subscriptionWithoutReturn as HookSubscription<T, A, E, S>;
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
					// The configuration may change the producer or an important option
					// So, it is important to reconcile before running.
					// In the normal flow, this reconciliation happens at the commit phase
					// but if we are to run during render, we should do it now.
					reconcileInstance(instance, config);

					let runArgs = (config.autoRunArgs || []) as A;
					// runp guarantees returning a promise
					throw instance.actions.runp.apply(null, runArgs);
				}
			} else if (currentStatus === "pending") {
				throw instance.promise!;
			}
		}
		if (throwError && currentReturn.isError) {
			throw currentReturn.error;
		}

		return currentReturn.data;
	}

	function onChange(
		newEvents: HookChangeEventsFunction<T, A, E> | HookChangeEvents<T, A, E>
	) {
		if (isFunction(newEvents)) {
			let events = newEvents as HookChangeEventsFunction<T, A, E>;
			let maybeEvents = events(changeEvents);
			if (maybeEvents) {
				changeEvents = maybeEvents;
			}
		} else if (newEvents) {
			changeEvents = newEvents as HookChangeEvents<T, A, E>;
		}
	}

	function onSubscribe(
		newEvents:
			| UseAsyncStateEventSubscribeFunction<T, A, E>
			| UseAsyncStateEventSubscribe<T, A, E>
	) {
		if (isFunction(newEvents)) {
			let events = newEvents as UseAsyncStateEventSubscribeFunction<T, A, E>;
			let maybeEvents = events(subscribeEvents);
			if (maybeEvents) {
				subscribeEvents = maybeEvents;
			}
		} else if (newEvents) {
			subscribeEvents = newEvents as UseAsyncStateEventSubscribe<T, A, E>;
		}
	}
}

export function beginRenderSubscription<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	newConfig: PartialUseAsyncStateConfiguration<T, A, E, S>,
	deps: unknown[]
): SubscriptionAlternate<T, A, E, S> | null {
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
		if (!comparingFunction(subscription.return.data, newSelectedValue)) {
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

export function completeRenderSubscription<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>
): void {
	if (__DEV__) {
		__DEV__unsetHookCallerName();
	}
	let { config, alternate } = subscription;
	let usedReturn = (alternate || subscription).return;

	if (config.concurrent) {
		// Reading via "read" may result in running the instance's producer.
		// So, it is important to reconcile before running.
		// Reconciliation is done inside the "read" function and only
		// when we should run.
		usedReturn.read(true, false);
	}
}

export function commit<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	pendingAlternate: SubscriptionAlternate<T, A, E, S> | null
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

	if (version !== currentInstance.version) {
		subscription.update(forceComponentUpdate);
		return;
	}

	reconcileInstance(currentInstance, subscription.config);
}

function reconcileInstance<T, A extends unknown[], E, S>(
	instance: StateInterface<T, A, E>,
	currentConfig: PartialUseAsyncStateConfiguration<T, A, E, S>
) {
	let instanceActions = instance.actions;

	// 📝 We can call this part the instance reconciliation
	// patch the given config and the new producer if provided and different
	// we might be able to iterate over properties and re-assign only the ones
	// that changed and are supported.
	instanceActions.patchConfig(currentConfig);
	if (currentConfig.payload) {
		instanceActions.mergePayload(currentConfig.payload);
	}

	let currentProducer = instance.fn;
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

function resolveSubscriptionKey<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>
) {
	let key = subscription.config.subscriptionKey || subscription.at || undefined;

	return `${key}-${(subscription.instance.subsIndex || 0) + 1}`;
}

export function autoRunAndSubscribeEvents<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>
) {
	let currentConfig = subscription.config;
	let currentInstance = subscription.instance;
	let instanceActions = currentInstance.actions;

	// we capture this state here to test it against updates in a fast way
	let committedState = currentInstance.state;
	// perform the subscription to the instance here
	let onStateChangeCallback = onStateChange<T, A, E, S>;
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

	let subscriptionSubscribeEvents = subscription.subscribeEvents;
	if (subscriptionSubscribeEvents) {
		let unsubscribeFromEvents = invokeSubscribeEvents(
			currentInstance,
			subscriptionSubscribeEvents
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

function onStateChange<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	committedState: State<T, A, E>,
	newState: State<T, A, E>
) {
	let currentReturn = subscription.return;
	let currentConfig = subscription.config;
	let currentInstance = subscription.instance;

	// the very first thing to do, is to invoke change events if relevant
	let changeEvents = currentConfig.events?.change;
	if (changeEvents) {
		invokeChangeEvents(currentInstance, changeEvents);
	}
	let subscriptionChangeEvents = subscription.changeEvents;
	if (subscriptionChangeEvents) {
		invokeChangeEvents(currentInstance, subscriptionChangeEvents);
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

function shouldRunSubscription<T, A extends unknown[], E, S>(
	instance: StateInterface<T, A, E>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>
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

export function invokeChangeEvents<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	events: UseAsyncStateEventFn<T, A, E> | UseAsyncStateEventFn<T, A, E>[]
) {
	let nextState = instance.state;
	const changeHandlers: UseAsyncStateEventFn<T, A, E>[] = isArray(events)
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

export function invokeSubscribeEvents<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	events: UseAsyncStateEventSubscribe<T, A, E> | undefined
): CleanupFn[] | null {
	if (!events || !instance) {
		return null;
	}

	let eventProps: SubscribeEventProps<T, A, E> = instance.actions;

	let handlers: ((props: SubscribeEventProps<T, A, E>) => CleanupFn)[] =
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

export function __DEV__spyOnStateUsage(
	sub: SubscriptionAlternate<any, any, any, any>
) {
	if (__DEV__) {
		let didSpy = true;
		if (!sub.__DEV__) {
			didSpy = false;
			sub.__DEV__ = {
				didWarn: false,
				didUseState: false,
				spiedReturn: sub.return,
			};
		}
		let devSpy = sub.__DEV__;
		let returnedValue = sub.return;

		if (didSpy && returnedValue === devSpy.spiedReturn) {
			// we are already spying over this return value
			return;
		}

		let clonedReturn = { ...returnedValue };

		let read = clonedReturn.read;
		let state = clonedReturn.state;
		let lastSuccess = clonedReturn.state;

		Object.defineProperty(clonedReturn, "state", {
			get: function () {
				sub.__DEV__!.didUseState = true;
				return state;
			},
			enumerable: true,
		});
		Object.defineProperty(clonedReturn, "lastSuccess", {
			get: function () {
				devSpy.didUseState = true;
				return lastSuccess;
			},
			enumerable: true,
		});
		// consider read as a way to get the state too
		Object.defineProperty(clonedReturn, "read", {
			get: function () {
				devSpy.didUseState = true;
				return read;
			},
			enumerable: true,
		});

		Object.freeze(clonedReturn);

		sub.return = clonedReturn;
		devSpy.spiedReturn = clonedReturn;
	}
}

export function __DEV__warnInDevAboutUnusedState(
	sub: SubscriptionAlternate<any, any, any, any>
) {
	if (__DEV__) {
		React.useLayoutEffect(() => {
			let devSpy = sub.__DEV__;
			if (!devSpy) {
				return;
			}

			if (!devSpy.didUseState && !devSpy.didWarn) {
				devSpy.didWarn = true;
				console.error(
					`[Warning] - useAsyncStates called in ${sub.at} without ` +
						"using the state, lastSuccess or read properties. You can use the source " +
						"directly if it is global scoped or via createSource. You are mostly" +
						" using the hook to get the run or another function while performing" +
						" a subscription. This is not recommended and not useful."
				);
			}
		}, [sub.return]);
	}
}
