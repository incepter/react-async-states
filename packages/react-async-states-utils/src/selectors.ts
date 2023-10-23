import {
  InitialState,
  PendingState,
  SuccessState,
  ErrorState,
  State,
  Status
} from "react-async-states";

type InitialExtendedState = { isInitial: true, isPending: false, isError: false, isAborted: false, isSuccess: false };
type PendingExtendedState = { isInitial: false, isPending: true, isError: false, isAborted: false, isSuccess: false };
type SuccessExtendedState = { isInitial: false, isPending: false, isError: false, isAborted: false, isSuccess: true };
type ErrorExtendedState = { isInitial: false, isPending: false, isError: true, isAborted: false, isSuccess: false };
type AbortedExtendedState = { isInitial: false, isPending: false, isError: false, isAborted: true, isSuccess: false };

export type StateWithBooleanStatus<T, E = unknown, R = unknown, A extends unknown[] = unknown[]> =
  InitialState<T, A> & InitialExtendedState |
  PendingState<T, A> & PendingExtendedState |
  SuccessState<T, A> & SuccessExtendedState |
  ErrorState<T, E, A> & ErrorExtendedState;

type ExtendStatusReturn<T, E, R, A extends unknown[]> =
  InitialExtendedState |
  PendingExtendedState |
  SuccessExtendedState |
  AbortedExtendedState |
  ErrorExtendedState;

function extendStatus<T, E = unknown, R = unknown, A extends unknown[] = unknown[]>(
  state: State<T, E, R, A>
): ExtendStatusReturn<T, E, R, A> {
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

export function addBooleanStatus<T, E = unknown, R = unknown, A extends unknown[] = unknown[]>(state: State<T, E, R, A>): StateWithBooleanStatus<T, E, R, A> {
  let extended = extendStatus<T, E, R>(state);
  return Object.assign({}, extended, state) as StateWithBooleanStatus<T, E, R, A>;
}
