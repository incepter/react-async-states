import {
	InstanceEventType,
	ProducerCallbacks,
	State,
	StateChangeEventHandler,
	StateInterface,
} from "../types";
import { aborted, error, success } from "../enums";
import { isArray } from "../helpers/core";
import { isFunction } from "../utils";

export function invokeChangeCallbacks<T, E, A extends unknown[]>(
	state: State<T, E, A>,
	callbacks: ProducerCallbacks<T, E, A> | undefined
) {
	if (!callbacks) {
		return;
	}
	let { onError, onSuccess } = callbacks;
	if (onSuccess && state.status === success) {
		onSuccess(state);
	}
	if (onError && state.status === error) {
		onError(state);
	}
}

export function invokeSingleChangeEvent<T, E, A extends unknown[]>(
	state: State<T, E, A>,
	event: StateChangeEventHandler<T, E, A>
) {
	if (isFunction(event)) {
		event(state);
	} else if (typeof event === "object" && event.status === state.status) {
		event.handler(state);
	}
}

export function invokeInstanceEvents<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	type: InstanceEventType
) {
	let events = instance.events;
	if (!events || !events[type]) {
		return;
	}
	switch (type) {
		case "change": {
			Object.values(events[type]!).forEach((registeredEvents) => {
				if (isArray(registeredEvents)) {
					registeredEvents.forEach((evt) => {
						invokeSingleChangeEvent(instance.actions.getState(), evt);
					});
				} else {
					invokeSingleChangeEvent(
						instance.actions.getState(),
						registeredEvents
					);
				}
			});
			return;
		}
		case "dispose": {
			Object.values(events[type]!).forEach((registeredEvents) => {
				if (isArray(registeredEvents)) {
					registeredEvents.forEach((evt) => evt());
				} else {
					registeredEvents();
				}
			});
			return;
		}
		case "cache-change": {
			Object.values(events[type]!).forEach((registeredEvents) => {
				if (isArray(registeredEvents)) {
					registeredEvents.forEach((evt) => evt(instance.cache));
				} else {
					registeredEvents(instance.cache);
				}
			});
			return;
		}
	}
}
