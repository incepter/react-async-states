import {
	AsyncStateSubscribeProps,
	InstanceEventHandlerType,
	InstanceEvents,
	InstanceEventType,
	State,
	StateInterface,
} from "../types";
import { __DEV__, isFunction } from "../utils";
import devtools from "../devtools/Devtools";

export function subscribeToInstance<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	options: ((s: State<T, A, E>) => void) | AsyncStateSubscribeProps<T, A, E>
) {
	let props = isFunction(options) ? { cb: options } : options;

	if (!isFunction(props.cb)) {
		return;
	}

	if (!instance.subsIndex) {
		instance.subsIndex = 0;
	}
	if (!instance.subscriptions) {
		instance.subscriptions = {};
	}

	instance.subsIndex += 1;

	let subscriptionKey: string | undefined = props.key;

	if (subscriptionKey === undefined) {
		subscriptionKey = `$${instance.subsIndex}`;
	}

	function cleanup() {
		delete instance.subscriptions![subscriptionKey!];
		if (__DEV__) devtools.emitUnsubscription(instance, subscriptionKey!);
		if (instance.config.resetStateOnDispose) {
			if (Object.values(instance.subscriptions!).length === 0) {
				instance.actions.dispose();
			}
		}
	}

	instance.subscriptions[subscriptionKey] = { props, cleanup };

	if (__DEV__) devtools.emitSubscription(instance, subscriptionKey);
	return cleanup;
}
export function subscribeToInstanceEvent<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	eventType: InstanceEventType,
	eventHandler: InstanceEventHandlerType<T, A, E>
) {
	if (!instance.events) {
		instance.events = {} as InstanceEvents<T, A, E>;
	}
	if (!instance.events[eventType]) {
		instance.events[eventType] = {};
	}

	let events = instance.events[eventType]!;

	if (!instance.eventsIndex) {
		instance.eventsIndex = 0;
	}
	let index = ++instance.eventsIndex;

	events[index] = eventHandler;

	return function () {
		delete events[index];
	};
}

export function notifySubscribers<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>
) {
	if (!instance.subscriptions) {
		return;
	}
	Object.values(instance.subscriptions).forEach((subscription) => {
		subscription.props.cb(instance.state);
	});
}
