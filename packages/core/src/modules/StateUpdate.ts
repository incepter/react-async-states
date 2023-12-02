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

export function getQueueTail<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>
): UpdateQueue<T, A, E> | null {
	if (!instance.queue) {
		return null;
	}
	let current = instance.queue;
	while (current.next !== null) {
		current = current.next;
	}
	return current;
}

export function enqueueUpdate<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	newState: State<T, A, E>,
	callbacks?: ProducerCallbacks<T, A, E>
) {
	let update: UpdateQueue<T, A, E> = {
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

export function enqueueSetState<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	newValue: T | StateFunctionUpdater<T, A, E>,
	status = success,
	callbacks?: ProducerCallbacks<T, A, E>
) {
	let update: UpdateQueue<T, A, E> = {
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

export function ensureQueueIsScheduled<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>
) {
	if (!instance.queue) {
		return;
	}
	let queue: UpdateQueue<T, A, E> = instance.queue;
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

export function flushUpdateQueue<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>
) {
	if (!instance.queue) {
		return;
	}

	let current: UpdateQueue<T, A, E> | null = instance.queue;

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

export function scheduleDelayedPendingUpdate<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	newState: State<T, A, E>,
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
			notifySubscribers(instance as StateInterface<T, A, E>);
		}
	}

	let timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
	instance.pendingUpdate = { callback, id: timeoutId };
}

export function replaceInstanceState<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	newState: State<T, A, E>,
	notify: boolean = true,
	callbacks?: ProducerCallbacks<T, A, E>
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
		notifySubscribers(instance as StateInterface<T, A, E>);
	}
}

export function setInstanceState<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	newValue: T | StateFunctionUpdater<T, A, E>,
	status: Status = success,
	callbacks?: ProducerCallbacks<T, A, E>
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
	const savedProps = cloneProducerProps<T, A, E>({
		args: [effectiveValue] as A,
		payload: shallowClone(instance.payload),
	});
	if (__DEV__) devtools.emitReplaceState(instance, savedProps);
	// @ts-ignore
	let newState = StateBuilder[status](effectiveValue, savedProps) as State<
		T,
		A,
		E
	>;
	instance.actions.replaceState(newState, true, callbacks);
	stopAlteringState(wasAlteringState);
}

export function disposeInstance<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>
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
	const newState: State<T, A, E> = StateBuilder.initial<T, A>(
		initialState as T
	);
	instance.actions.replaceState(newState);
	if (__DEV__) devtools.emitDispose(instance);

	stopAlteringState(wasAltering);
	invokeInstanceEvents(instance, "dispose");
	return true;
}
