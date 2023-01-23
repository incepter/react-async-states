import {initial, pending, success, aborted, error, Status} from "../enums";
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
  initial<T>(initialValue): InitialState<T> {
    return freeze(state<T>(initial, initialValue, null, now()));
  },
  error<T, E = any>(data, props): ErrorState<T, E> {
    return freeze(state<T, E>(error, data, props, now()));
  },
  success<T>(data, props): SuccessState<T> {
    return freeze(state<T>(success, data, props, now()));
  },
  pending<T>(props): PendingState<T> {
    return freeze(state<T>(pending, null, props, now()));
  },
  aborted<T, E = any, R = any>(reason, props): AbortedState<T, E, R> {
    return freeze(state<T, E, R>(Status.aborted, reason, props, now()));
  }
}) as StateBuilderInterface;
