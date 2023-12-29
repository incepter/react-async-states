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

export type UseConfig<TData, A extends unknown[], E, S = State<TData, A, E>> = {
  lane?: string;
  producer?: Producer<TData, A, E>;
  payload?: Record<string, unknown>;

  lazy?: boolean;
  autoRunArgs?: A;
  areEqual?: EqualityFn<S>;
  subscriptionKey?: string;
  selector?: UseSelector<TData, A, E, S>;
  events?: UseAsyncStateEvents<TData, A, E>;

  condition?:
    | boolean
    | ((
        state: State<TData, A, E>,
        args?: A,
        payload?: Record<string, unknown> | null
      ) => boolean);

  wait?: boolean;
};

export type {
  CleanupFn,
  PartialUseAsyncConfig,
  UseSelector,
  SubscribeEventProps,
  UseAsyncStateEvents,
  UseAsyncStateEventSubscribe,
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
