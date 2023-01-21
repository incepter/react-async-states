import {
  AbortedState,
  CachedState,
  ErrorState,
  InitialState,
  LastSuccessSavedState,
  PendingState,
  Producer,
  ProducerConfig,
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

export type BaseSelectorKey = string | Source<any, any, any>

export type UseSelectorFunctionKeys = ((allKeys: string[]) => BaseSelectorKey[]);

export type SelectorKeysArg =
  BaseSelectorKey
  | BaseSelectorKey[]
  | UseSelectorFunctionKeys

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;
export type FunctionSelectorArgument = Record<string, FunctionSelectorItem<any, any, any> | undefined>;

export interface InitialFunctionSelectorItem<T, E, R> extends Partial<InitialState<T>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface PendingFunctionSelectorItem<T, E, R> extends Partial<PendingState<T>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface AbortedFunctionSelectorItem<T, E, R> extends Partial<AbortedState<T, E, R>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface SuccessFunctionSelectorItem<T, E, R> extends Partial<SuccessState<T>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface ErrorFunctionSelectorItem<T, E, R> extends Partial<ErrorState<T, E>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export type FunctionSelectorItem<T, E = any, R = any> =
  InitialFunctionSelectorItem<T, E, R>
  |
  PendingFunctionSelectorItem<T, E, R>
  |
  AbortedFunctionSelectorItem<T, E, R>
  |
  SuccessFunctionSelectorItem<T, E, R>
  |
  ErrorFunctionSelectorItem<T, E, R>;

export type SimpleSelector<T, E = any, R = any, D = State<T, E, R>> = (props: FunctionSelectorItem<T, E, R> | undefined) => D;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any, any, any> | undefined)[]) => T;

export type InstanceOrNull<T, E = any, R = any> =
  StateInterface<T, E, R>
  | null;
