import { Producer, State } from "async-states";

import { EqualityFn, UseAsyncStateEvents, UseSelector } from "./hooks/types";

export type {
  Source,
  CachedState,
  ErrorState,
  InitialState,
  LastSuccessSavedState,
  PendingState,
  State,
  StateFunctionUpdater,
  StateInterface,
  SuccessState,
} from "async-states";

export type UseConfig<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
> = {
  payload?: Record<string, unknown>;

  lazy?: boolean;
  autoRunArgs?: TArgs;
  areEqual?: EqualityFn<S>;
  subscriptionKey?: string;
  selector?: UseSelector<TData, TArgs, TError, S>;
  events?: UseAsyncStateEvents<TData, TArgs, TError>;

  condition?:
    | boolean
    | ((
        state: State<TData, TArgs, TError>,
        args?: TArgs,
        payload?: Record<string, unknown> | null
      ) => boolean);
};

export type {
  CleanupFn,
  PartialUseAsyncConfig,
  UseSelector,
  SubscribeEventProps,
  UseAsyncStateEvents,
  HookSubscribeEvents,
  UseAsyncStateChangeEvent,
  UseAsyncStateEventFn,
  UseAsyncStateChangeEventHandler,
  UseAsyncStateConfiguration,
  MixedConfig,
  ConfigWithProducerWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithSourceWithSelector,
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  BaseConfig,
  EqualityFn,
  UseAsyncState,
  UseAsyncChangeEventProps,
} from "./hooks/types";
