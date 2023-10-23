import {
	ProducerCallbacks,
	State,
	StateFunctionUpdater,
	StateInterface,
	UpdateQueue,
} from "../types";
import { pending, Status, success } from "../enums";
import { notifySubscribers } from "./StateSubscription";
import { __DEV__, cloneProducerProps, isFunction } from "../utils";
import devtools from "../devtools/Devtools";
import { freeze, shallowClone } from "../helpers/core";
import { invokeChangeCallbacks, invokeInstanceEvents } from "./StateEvent";
import { hasCacheEnabled, saveCacheAfterSuccessfulUpdate } from "./StateCache";
import { StateBuilder } from "../helpers/StateBuilder";

let isCurrentlyEmitting = false;
let isCurrentlyAlteringState = false;
let isCurrentlyFlushingAQueue = false;

export function startEmitting() {
	let prevIsEmitting = isCurrentlyEmitting;
	isCurrentlyEmitting = true;
	return prevIsEmitting;
}
export function stopEmitting(restoreToThisValue: boolean) {
	isCurrentlyEmitting = restoreToThisValue;
}

export function isAlteringState() {
	return isCurrentlyAlteringState;
}
export function startAlteringState() {
	let prevIsAltering = isCurrentlyAlteringState;
	isCurrentlyAlteringState = true;
	return prevIsAltering;
}
export function stopAlteringState(restoreToThisValue: boolean) {
	isCurrentlyAlteringState = restoreToThisValue;
}

export function getQueueTail<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
): UpdateQueue<T, E, A> | null {
	if (!instance.queue) {
		return null;
	}
	let current = instance.queue;
	while (current.next !== null) {
		current = current.next;
	}
	return current;
}

export function enqueueUpdate<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	newState: State<T, E, A>,
	callbacks?: ProducerCallbacks<T, E, A>
) {
	let update: UpdateQueue<T, E, A> = {
		callbacks,
		data: newState,
		kind: 0,
		next: null,
	};
	if (!instance.queue) {
		instance.queue = update;
	} else {
		let tail = getQueueTail(instance);
		if (!tail) {
			return;
		}
		tail.next = update;
	}

	ensureQueueIsScheduled(instance);
}

export function enqueueSetState<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	newValue: T | StateFunctionUpdater<T, E, A>,
	status = success,
	callbacks?: ProducerCallbacks<T, E, A>
) {
	let update: UpdateQueue<T, E, A> = {
		callbacks,
		kind: 1,
		data: { data: newValue, status },
		next: null,
	};
	if (!instance.queue) {
		instance.queue = update;
	} else {
		let tail = getQueueTail(instance);
		if (!tail) {
			return;
		}
		tail.next = update;
	}

	ensureQueueIsScheduled(instance);
}

export function ensureQueueIsScheduled<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
) {
	if (!instance.queue) {
		return;
	}
	let queue: UpdateQueue<T, E, A> = instance.queue;
	if (queue.id) {
		return;
	}
	let delay = instance.config.keepPendingForMs || 0;
	let elapsedTime = Date.now() - instance.state.timestamp;
	let remainingTime = delay - elapsedTime;

	if (remainingTime > 0) {
		queue.id = setTimeout(() => flushUpdateQueue(instance), remainingTime);
	} else {
		flushUpdateQueue(instance);
	}
}

export function flushUpdateQueue<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
) {
	if (!instance.queue) {
		return;
	}

	let current: UpdateQueue<T, E, A> | null = instance.queue;

	instance.queue = null;

	let prevIsFlushing = isCurrentlyFlushingAQueue;
	isCurrentlyFlushingAQueue = true;

	while (current !== null) {
		let {
			data: { status },
			callbacks,
		} = current;
		let canBailoutPendingStatus = status === pending && current.next !== null;

		if (canBailoutPendingStatus) {
			current = current.next;
		} else {
			if (current.kind === 0) {
				instance.actions.replaceState(current.data, undefined, callbacks);
			}
			if (current.kind === 1) {
				let {
					data: { data, status },
				} = current;
				instance.actions.setState(data, status, callbacks);
			}
			current = current.next;
		}
	}
	isCurrentlyFlushingAQueue = prevIsFlushing;
	notifySubscribers(instance);
}

export function scheduleDelayedPendingUpdate<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	newState: State<T, E, A>,
	notify: boolean
) {
	function callback() {
		// callback always sets the state with a pending status
		if (__DEV__) devtools.startUpdate(instance);
		let clonedState = shallowClone(newState);
		clonedState.timestamp = Date.now();
		instance.state = freeze(clonedState); // <-- status is pending!
		instance.pendingUpdate = null;
		instance.version += 1;
		invokeInstanceEvents(instance, "change");
		if (__DEV__) devtools.emitUpdate(instance);

		if (notify) {
			notifySubscribers(instance as StateInterface<T, E, A>);
		}
	}

	let timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
	instance.pendingUpdate = { callback, id: timeoutId };
}

export function replaceInstanceState<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	newState: State<T, E, A>,
	notify: boolean = true,
	callbacks?: ProducerCallbacks<T, E, A>
) {
	let { config } = instance;
	let isPending = newState.status === pending;

	if (isPending && config.skipPendingStatus) {
		return;
	}

	if (instance.queue) {
		enqueueUpdate(instance, newState, callbacks);
		return;
	}

	if (
		config.keepPendingForMs &&
		instance.state.status === pending &&
		!isCurrentlyFlushingAQueue
	) {
		enqueueUpdate(instance, newState, callbacks);
		return;
	}

	// pending update has always a pending status
	// setting the state should always clear this pending update
	// because it is stale, and we can safely skip it
	if (instance.pendingUpdate) {
		clearTimeout(instance.pendingUpdate.id);
		instance.pendingUpdate = null;
	}

	if (
		isPending &&
		instance.config.skipPendingDelayMs &&
		isFunction(setTimeout) &&
		instance.config.skipPendingDelayMs > 0
	) {
		scheduleDelayedPendingUpdate(instance, newState, notify);
		return;
	}

	if (__DEV__) devtools.startUpdate(instance);
	instance.state = newState;
	instance.version += 1;
	invokeChangeCallbacks(newState, callbacks);
	invokeInstanceEvents(instance, "change");
	if (__DEV__) devtools.emitUpdate(instance);

	if (instance.state.status === success) {
		instance.lastSuccess = instance.state;
		if (hasCacheEnabled(instance)) {
			saveCacheAfterSuccessfulUpdate(instance);
		}
	}

	if (!isPending) {
		instance.promise = null;
	}

	if (notify && !isCurrentlyFlushingAQueue) {
		notifySubscribers(instance as StateInterface<T, E, A>);
	}
}

export function setInstanceState<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	newValue: T | StateFunctionUpdater<T, E, A>,
	status: Status = success,
	callbacks?: ProducerCallbacks<T, E, A>
) {
	if (!StateBuilder[status]) {
		throw new Error(`Unknown status ('${status}')`);
	}
	if (instance.queue) {
		enqueueSetState(instance, newValue, status, callbacks);
		return;
	}

	let wasAlteringState = startAlteringState();

	if (
		instance.state.status === pending ||
		(isFunction(instance.currentAbort) && !isCurrentlyEmitting)
	) {
		instance.actions.abort();
		instance.currentAbort = undefined;
	}

	let effectiveValue = newValue;
	if (isFunction(newValue)) {
		effectiveValue = newValue(instance.state);
	}
	const savedProps = cloneProducerProps<T, E, A>({
		args: [effectiveValue] as A,
		payload: shallowClone(instance.payload),
	});
	if (__DEV__) devtools.emitReplaceState(instance, savedProps);
	// @ts-ignore
	let newState = StateBuilder[status](effectiveValue, savedProps) as State<
		T,
		E,
		A
	>;
	instance.actions.replaceState(newState, true, callbacks);
	stopAlteringState(wasAlteringState);
}

export function disposeInstance<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
) {
	if (instance.subscriptions && Object.keys(instance.subscriptions).length) {
		// this means that this state is retained by some subscriptions
		return false;
	}

	let wasAltering = startAlteringState();

	instance.actions.abort();
	if (instance.queue) {
		clearTimeout(instance.queue.id);
		instance.queue = null;
	}

	let initialState = instance.config.initialValue;
	if (isFunction(initialState)) {
		initialState = initialState(instance.cache);
	}
	const newState: State<T, E, A> = StateBuilder.initial<T, A>(
		initialState as T
	);
	instance.actions.replaceState(newState);
	if (__DEV__) devtools.emitDispose(instance);

	stopAlteringState(wasAltering);
	invokeInstanceEvents(instance, "dispose");
	return true;
}
