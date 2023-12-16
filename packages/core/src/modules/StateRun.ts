import {
	AbortFn,
	CachedState,
	ErrorState,
	PendingState,
	ProducerCallbacks,
	ProducerSavedProps,
	RUNCProps,
	StateInterface,
	SuccessState,
} from "../types";
import { pending, RunEffect, Status } from "../enums";
import { __DEV__, cloneProducerProps, emptyArray, isFunction } from "../utils";
import { freeze, noop, now } from "../helpers/core";
import {
	computeRunHash,
	didCachedStateExpire,
	getCachedState,
	hasCacheEnabled,
	removeCachedStateAndSpreadOnLanes,
} from "./StateCache";
import { createProps } from "./StateProps";
import { run } from "../wrapper";
import devtools from "../devtools/Devtools";
import {
	replaceInstanceState,
	startAlteringState,
	stopAlteringState,
} from "./StateUpdate";

export function runcInstance<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	props?: RUNCProps<T, A, E>
) {
	let config = instance.config;

	let effectDurationMs = Number(config.runEffectDurationMs) || 0;
	let shouldRunImmediately = !config.runEffect || effectDurationMs === 0;

	if (shouldRunImmediately) {
		let clonedPayload = Object.assign({}, instance.payload);
		return runInstanceImmediately(instance, clonedPayload, props);
	}

	return runInstanceWithEffects(
		instance,
		config.runEffect!,
		effectDurationMs,
		props
	);
}

function scheduleDelayedRun<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	durationMs: number,
	props?: RUNCProps<T, A, E>
): AbortFn {
	let abortCallback: AbortFn | null = null;

	let timeoutId = setTimeout(function theDelayedRunExecution() {
		instance.pendingTimeout = null;

		let clonedPayload = Object.assign({}, instance.payload);
		abortCallback = runInstanceImmediately(instance, clonedPayload, props);
	}, durationMs);

	instance.pendingTimeout = { at: Date.now(), id: timeoutId };

	return function abortCleanup(reason?: any) {
		clearTimeout(timeoutId);
		instance.pendingTimeout = null;

		if (isFunction(abortCallback)) {
			abortCallback(reason);
		}
	};
}

function runInstanceWithEffects<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	effect: RunEffect,
	durationMs: number,
	props?: RUNCProps<T, A, E>
): AbortFn {
	switch (effect) {
		case "delay":
		case "debounce": {
			if (instance.pendingTimeout) {
				let now = Date.now();
				let deadline = instance.pendingTimeout.at + durationMs;
				if (now < deadline) {
					clearTimeout(instance.pendingTimeout.id);
				}
			}
			return scheduleDelayedRun(instance, durationMs, props);
		}
		case "throttle": {
			if (instance.pendingTimeout) {
				let now = Date.now();
				let deadline = instance.pendingTimeout.at + durationMs;
				if (now <= deadline) {
					return function noop() {
						// do nothing when throttled
					};
				}
				break;
			} else {
				return scheduleDelayedRun(instance, durationMs, props);
			}
		}
	}

	let clonedPayload = Object.assign({}, instance.payload);
	return runInstanceImmediately(instance, clonedPayload, props);
}

function cleanInstancePendingStateBeforeImmediateRun(
	instance: StateInterface<any, any, any>
) {
	if (instance.pendingUpdate) {
		clearTimeout(instance.pendingUpdate.id);
		instance.pendingUpdate = null;
	}

	instance.actions.abort();
	instance.currentAbort = undefined;
}

function replaceStateBecauseNoProducerProvided<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	props?: RUNCProps<T, A, E>
) {
	let args = (props?.args ?? emptyArray) as A;

	// keep these for readability
	let newStateData = args[0] as T;
	let newStateStatus = args[1] as Status;

	instance.actions.setState(newStateData, newStateStatus, props);

	return noop;
}

function replaceStateAndBailoutRunFromCachedState<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	cachedState: CachedState<T, A, E>
) {
	let actualState = instance.state;
	let nextState = cachedState.state;

	// this means that the current state reference isn't the same
	if (actualState !== nextState) {
		// this sets the new state and notifies subscriptions
		// true for notifying
		replaceInstanceState(instance, nextState, true);
	}
}

export function runInstanceImmediately<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	payload: unknown,
	props?: RUNCProps<T, A, E>
): AbortFn {
	// when there is no producer attached to the instance, skip everything
	// and replace state immediately. This will skip cache too.
	if (!instance.fn) {
		return replaceStateBecauseNoProducerProvided(instance, props);
	}

	let wasAltering = startAlteringState();

	// the pendingUpdate has always a pending status, it is delayed because
	// of the config.skipPendingDelayMs configuration option.
	let hasPendingUpdate = instance.pendingUpdate !== null;
	let isCurrentlyPending = instance.state.status === pending;

	if (isCurrentlyPending || hasPendingUpdate) {
		cleanInstancePendingStateBeforeImmediateRun(instance);
	}
	// this should not be into the previous if, because we need all the time
	// to invoke the currentAbort so that cleanups of the previous run are invoked
	if (isFunction(instance.currentAbort)) {
		instance.currentAbort();
	}

	if (hasCacheEnabled(instance)) {
		let cacheConfig = instance.config.cacheConfig;
		let runHash = computeRunHash(payload, props, cacheConfig?.hash);

		let cachedState = getCachedState(instance, runHash);

		// only use a cached entry if not expired
		if (cachedState && !didCachedStateExpire(cachedState)) {
			replaceStateAndBailoutRunFromCachedState(instance, cachedState);
			return;
		}
		// this means that the cache entry was expired, we need to removed it
		// from the cache
		if (cachedState) {
			removeCachedStateAndSpreadOnLanes(instance, runHash);
		}
	}

	let indicators = { index: 1, done: false, cleared: false, aborted: false };
	let producerProps = createProps(instance, indicators, payload, props);

	instance.latestRun = {
		args: producerProps.args,
		payload: producerProps.payload,
	};
	instance.currentAbort = producerProps.abort;

	let runResult = run(
		instance.fn,
		producerProps,
		indicators,
		onSettled,
		instance.config.retryConfig,
		props // callbacks
	);

	if (runResult) {
		// Promise<T>
		if (__DEV__)
			devtools.emitRunPromise(instance, cloneProducerProps(producerProps));

		instance.promise = runResult;
		let currentState = instance.state;
		if (currentState.status === pending) {
			currentState = currentState.prev;
		}
		let savedProps = cloneProducerProps(producerProps);
		let pendingState: PendingState<T, A, E> = {
			data: null,
			timestamp: now(),
			props: savedProps,
			prev: currentState,
			status: pending,
		};

		replaceInstanceState(instance, pendingState, true, props);
		stopAlteringState(wasAltering);
		return producerProps.abort;
	} else if (__DEV__) {
		devtools.emitRunSync(instance, cloneProducerProps(producerProps));
	}

	stopAlteringState(wasAltering);
	return noop;

	function onSettled(
		data: T | E,
		status: "success" | "error",
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, A, E>
	) {
		let state = freeze({
			status,
			data,
			props: savedProps,
			timestamp: now(),
		} as SuccessState<T, A> | ErrorState<T, A, E>);
		replaceInstanceState(instance, state, true, callbacks);
	}
}
