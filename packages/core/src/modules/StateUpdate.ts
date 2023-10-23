import {
	ProducerCallbacks,
	State,
	StateFunctionUpdater,
	StateInterface,
	UpdateQueue,
} from "../types";
import { pending, success } from "../enums";
import { notifySubscribers } from "./StateSubscription";
import { __DEV__ } from "../utils";
import devtools from "../devtools/Devtools";
import { freeze, shallowClone } from "../helpers/core";
import { invokeInstanceEvents } from "./StateEvent";

export function getQueueTail<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
): UpdateQueue<T, E, R, A> | null {
	if (!instance.queue) {
		return null;
	}
	let current = instance.queue;
	while (current.next !== null) {
		current = current.next;
	}
	return current;
}

export function enqueueUpdate<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	newState: State<T, E, R, A>,
	callbacks?: ProducerCallbacks<T, E, R, A>
) {
	let update: UpdateQueue<T, E, R, A> = {
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

export function enqueueSetState<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	newValue: T | StateFunctionUpdater<T, E, R, A>,
	status = success,
	callbacks?: ProducerCallbacks<T, E, R, A>
) {
	let update: UpdateQueue<T, E, R, A> = {
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

export function ensureQueueIsScheduled<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
) {
	if (!instance.queue) {
		return;
	}
	let queue: UpdateQueue<T, E, R, A> = instance.queue;
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

export function flushUpdateQueue<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
) {
	if (!instance.queue) {
		return;
	}

	let current: UpdateQueue<T, E, R, A> | null = instance.queue;

	delete instance.queue;

	instance.flushing = true;
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
	delete instance.flushing;
	notifySubscribers(instance);
}

export function scheduleDelayedPendingUpdate<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	newState: State<T, E, R, A>,
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
			notifySubscribers(instance as StateInterface<T, E, R, A>);
		}
	}

	let timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
	instance.pendingUpdate = { callback, id: timeoutId };
}
