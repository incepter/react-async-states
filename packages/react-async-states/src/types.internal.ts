import {
  AbortedState,
  CachedState,
  ErrorState,
  InitialState,
  LastSuccessSavedState,
  PendingState,
  Source,
  State,
  StateInterface,
  SuccessState
} from "async-states";

export type {
  Source,
  AbortedState,
  CachedState,
  ErrorState,
  InitialState,
  LastSuccessSavedState,
  PendingState,
  State,
  StateFunctionUpdater,
  StateInterface,
  SuccessState,
  EqualityFn,
  MixedConfig,
  UseAsyncState,
  UseAsyncStateType,
  CleanupFn,
  BaseConfig,
  BaseUseAsyncState,
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  ConfigWithProducerWithoutSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithSelector,
  SubscribeEventProps,
  UseAsyncStateEvents,
  UseAsyncStateEventFn,
  UseAsyncStateEventProps,
  UseAsyncStateChangeEvent,
  UseAsyncStateChangeEventHandler,
  UseAsyncStateConfiguration,
  useSelector,
  UseAsyncStateEventSubscribe,
  PartialUseAsyncStateConfiguration,
} from "async-states";

export type BaseSelectorKey = string | Source<unknown, unknown, unknown, unknown[]>

export type UseSelectorFunctionKeys = ((allKeys: string[]) => BaseSelectorKey[]);

export type SelectorKeysArg =
  BaseSelectorKey
  | BaseSelectorKey[]
  | UseSelectorFunctionKeys

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;
export type FunctionSelectorArgument = Record<string, FunctionSelectorItem<any, any, any> | undefined>;

export interface InitialFunctionSelectorItem<T, E, R, A extends unknown[]> extends Partial<InitialState<T, A>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T, A>,
  cache?: Record<string, CachedState<T, E, R, A>> | null,
}

export interface PendingFunctionSelectorItem<T, E, R, A extends unknown[]> extends Partial<PendingState<T, A>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T, A>,
  cache?: Record<string, CachedState<T, E, R, A>> | null,
}

export interface AbortedFunctionSelectorItem<T, E, R, A extends unknown[]> extends Partial<AbortedState<T, E, R, A>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T, A>,
  cache?: Record<string, CachedState<T, E, R, A>> | null,
}

export interface SuccessFunctionSelectorItem<T, E, R, A extends unknown[]> extends Partial<SuccessState<T, A>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T, A>,
  cache?: Record<string, CachedState<T, E, R, A>> | null,
}

export interface ErrorFunctionSelectorItem<T, E, R, A extends unknown[]> extends Partial<ErrorState<T, E, A>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T, A>,
  cache?: Record<string, CachedState<T, E, R, A>> | null,
}

export type FunctionSelectorItem<T, E = unknown, R = unknown, A extends unknown[] = unknown[]> =
  InitialFunctionSelectorItem<T, E, R, A>
  |
  PendingFunctionSelectorItem<T, E, R, A>
  |
  AbortedFunctionSelectorItem<T, E, R, A>
  |
  SuccessFunctionSelectorItem<T, E, R, A>
  |
  ErrorFunctionSelectorItem<T, E, R, A>;

export type SimpleSelector<T, E = unknown, R = unknown, A extends unknown[] = unknown[], D = State<T, E, R, A>> = (props: FunctionSelectorItem<T, E, R> | undefined) => D;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any, any, any> | undefined)[]) => T;

export type InstanceOrNull<T, E = unknown, R = unknown, A extends unknown[] = unknown[]> =
  StateInterface<T, E, R, A>
  | null;

export type CreateType<T, E> = () => T
