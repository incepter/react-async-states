import {
  InitialState,
  PendingState,
  SuccessState,
  ErrorState,
  AbortedState,
  State,
  Status
} from "react-async-states";

type InitialExtendedState = { isInitial: true, isPending: false, isError: false, isAborted: false, isSuccess: false };
type PendingExtendedState = { isInitial: false, isPending: true, isError: false, isAborted: false, isSuccess: false };
type SuccessExtendedState = { isInitial: false, isPending: false, isError: false, isAborted: false, isSuccess: true };
type ErrorExtendedState = { isInitial: false, isPending: false, isError: true, isAborted: false, isSuccess: false };
type AbortedExtendedState = { isInitial: false, isPending: false, isError: false, isAborted: true, isSuccess: false };

export type StateWithBooleanStatus<T, E = any, R = any> =
  InitialState<T> & InitialExtendedState |
  PendingState<T> & PendingExtendedState |
  SuccessState<T> & SuccessExtendedState |
  ErrorState<T, E> & ErrorExtendedState |
  AbortedState<T, E, R> & AbortedExtendedState;

type ExtendStatusReturn<T, E, R> =
  InitialExtendedState |
  PendingExtendedState |
  SuccessExtendedState |
  AbortedExtendedState |
  ErrorExtendedState;

function extendStatus<T, E = any, R = any>(
  state: State<T, E, R>
): ExtendStatusReturn<T, E, R> {
  let status = state.status;
  switch (status) {
    case Status.initial: {
      return {
        isInitial: true,
        isPending: false,
        isError: false,
        isAborted: false,
        isSuccess: false
      }
    }
    case Status.pending: {
      return {
        isInitial: false,
        isPending: true,
        isError: false,
        isAborted: false,
        isSuccess: false
      }
    }
    case Status.aborted: {
      return {
        isInitial: false,
        isPending: false,
        isError: false,
        isAborted: true,
        isSuccess: false
      }
    }
    case Status.success: {
      return {
        isInitial: false,
        isPending: false,
        isError: false,
        isAborted: false,
        isSuccess: true
      }
    }
    case Status.error: {
      return {
        isInitial: false,
        isPending: false,
        isError: true,
        isAborted: false,
        isSuccess: false
      }
    }
  }
  throw new Error(`Status ${status} isn't recognized!`);
}

export function addBooleanStatus<T, E = any, R = any>(state: State<T, E, R>): StateWithBooleanStatus<T, E, R> {
  let extended = extendStatus<T, E, R>(state);
  return Object.assign({}, extended, state) as StateWithBooleanStatus<T, E, R>;
}
