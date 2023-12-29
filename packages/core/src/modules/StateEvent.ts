import {
  InstanceEventType,
  ProducerCallbacks,
  State,
  StateChangeEventHandler,
  StateInterface,
} from "../types";
import { error, success } from "../enums";
import { isArray } from "../helpers/core";
import { isFunction } from "../utils";

export function invokeChangeCallbacks<TData, A extends unknown[], E>(
  state: State<TData, A, E>,
  callbacks: ProducerCallbacks<TData, A, E> | undefined
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

export function invokeSingleChangeEvent<TData, A extends unknown[], E>(
  state: State<TData, A, E>,
  event: StateChangeEventHandler<TData, A, E>
) {
  if (isFunction(event)) {
    event(state);
  } else if (typeof event === "object" && event.status === state.status) {
    event.handler(state);
  }
}

export function invokeInstanceEvents<TData, A extends unknown[], E>(
  instance: StateInterface<TData, A, E>,
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
