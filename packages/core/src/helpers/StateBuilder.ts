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
import {freeze, now} from "./core";

function state<T, A extends unknown[]>(
  status: Status.initial, data: T | undefined,
  props: ProducerSavedProps<T, A> | null, timestamp: number
): InitialState<T, A>
function state<T, A extends unknown[]>(
  status: Status.pending, data: null, props: ProducerSavedProps<T, A> | null,
  timestamp: number
): PendingState<T, A>
function state<T, A extends unknown[]>(
  status: Status.success, data: T, props: ProducerSavedProps<T, A> | null,
  timestamp: number
): SuccessState<T, A>
function state<T, E, R, A extends unknown[]>(
  status: Status.aborted, data: R, props: ProducerSavedProps<T, A> | null,
  timestamp: number
): AbortedState<T, E, R, A>
function state<T, E, A extends unknown[]>(
  status: Status.error, data: E, props: ProducerSavedProps<T, A> | null,
  timestamp: number
): ErrorState<T, E, A>
function state<T, E, R, A extends unknown[]>(
  status, data, props: ProducerSavedProps<T, A> | null,
  timestamp: number
): State<T, E, R, A> {
  // @ts-ignore
  return {
    status,
    data,
    props,
    timestamp,
  };
}

export const StateBuilder = freeze({
  initial<T, A extends unknown[]>(initialValue: T | undefined, props?: ProducerSavedProps<T, A> | null): InitialState<T, A> {
    return freeze(state<T, A>(initial, initialValue, null, now()));
  },
  error<T, E, R, A extends unknown[]>(data: E, props: ProducerSavedProps<T, A> | null): ErrorState<T, E, A> {
    return freeze(state<T, E, A>(error, data, props, now()));
  },
  success<T, A extends unknown[]>(data: T, props: ProducerSavedProps<T, A> | null): SuccessState<T, A> {
    return freeze(state<T, A>(success, data, props, now()));
  },
  pending<T, A extends unknown[]>(props: ProducerSavedProps<T, A> | null): PendingState<T, A> {
    return freeze(state<T, A>(pending, null, props, now()));
  },
  aborted<T, E, R, A extends unknown[]>(reason: R, props: ProducerSavedProps<T, A> | null): AbortedState<T, E, R, A> {
    return freeze(state<T, E, R, A>(Status.aborted, reason, props, now()));
  }
}) as StateBuilderInterface;
