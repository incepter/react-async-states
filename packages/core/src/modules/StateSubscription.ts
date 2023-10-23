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

export function subscribeToInstance<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	options: ((s: State<T, E, A>) => void) | AsyncStateSubscribeProps<T, E, A>
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
export function subscribeToInstanceEvent<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	eventType: InstanceEventType,
	eventHandler: InstanceEventHandlerType<T, E, A>
) {
	if (!instance.events) {
		instance.events = {} as InstanceEvents<T, E, A>;
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

export function notifySubscribers<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
) {
	if (!instance.subscriptions) {
		return;
	}
	Object.values(instance.subscriptions).forEach((subscription) => {
		subscription.props.cb(instance.state);
	});
}
