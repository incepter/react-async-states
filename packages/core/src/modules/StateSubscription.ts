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

export function subscribeToInstance<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  options: ((s: State<TData, TArgs, TError>) => void) | AsyncStateSubscribeProps<TData, TArgs, TError>
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
    if (__DEV__) devtools.emitUnsub(instance, subscriptionKey!);
    if (instance.config.resetStateOnDispose) {
      instance.actions.dispose();
    }
  }

  instance.subscriptions[subscriptionKey] = { props, cleanup };

  if (__DEV__) devtools.emitSub(instance, subscriptionKey);
  return cleanup;
}
export function subscribeToInstanceEvent<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  eventType: InstanceEventType,
  eventHandler: InstanceEventHandlerType<TData, TArgs, TError>
) {
  if (!instance.events) {
    instance.events = {} as InstanceEvents<TData, TArgs, TError>;
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

export function notifySubscribers<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  if (!instance.subscriptions) {
    return;
  }
  Object.values(instance.subscriptions).forEach((subscription) => {
    subscription.props.cb(instance.state);
  });
}
