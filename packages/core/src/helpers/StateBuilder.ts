import {initial, pending, success, error, Status} from "../enums";
import {
  AbortedState,
  ErrorState,
  InitialState,
  PendingState,
  ProducerSavedProps,
  State,
  StateBuilderInterface,
  SuccessState
} from "../types";
import {freeze, now} from "./corejs";

function state<T>(
  status: Status.initial, data: T | undefined,
  props: ProducerSavedProps<T> | null, timestamp: number
): InitialState<T>
function state<T>(
  status: Status.pending, data: null, props: ProducerSavedProps<T> | null,
  timestamp: number
): PendingState<T>
function state<T>(
  status: Status.success, data: T, props: ProducerSavedProps<T> | null,
  timestamp: number
): SuccessState<T>
function state<T, E, R>(
  status: Status.aborted, data: R, props: ProducerSavedProps<T> | null,
  timestamp: number
): AbortedState<T, E, R>
function state<T, E>(
  status: Status.error, data: E, props: ProducerSavedProps<T> | null,
  timestamp: number
): ErrorState<T, E>
function state<T, E, R>(
  status, data, props: ProducerSavedProps<T> | null,
  timestamp: number
): State<T, E, R> {
  // @ts-ignore
  return {
    status,
    data,
    props,
    timestamp,
  };
}

export const StateBuilder = freeze({
  initial<T>(initialValue: T | undefined, props?: ProducerSavedProps<T> | null): InitialState<T> {
    return freeze(state<T>(initial, initialValue, null, now()));
  },
  error<T, E = any>(data: E, props: ProducerSavedProps<T> | null): ErrorState<T, E> {
    return freeze(state<T, E>(error, data, props, now()));
  },
  success<T>(data: T, props: ProducerSavedProps<T> | null): SuccessState<T> {
    return freeze(state<T>(success, data, props, now()));
  },
  pending<T>(props: ProducerSavedProps<T> | null): PendingState<T> {
    return freeze(state<T>(pending, null, props, now()));
  },
  aborted<T, E = any, R = any>(reason: R, props: ProducerSavedProps<T> | null): AbortedState<T, E, R> {
    return freeze(state<T, E, R>(Status.aborted, reason, props, now()));
  }
}) as StateBuilderInterface;
