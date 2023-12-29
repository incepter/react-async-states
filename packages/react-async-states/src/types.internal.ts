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

export type UseConfig<T, A extends unknown[], E, S = State<T, A, E>> = {
  lane?: string;
  producer?: Producer<T, A, E>;
  payload?: Record<string, unknown>;

  lazy?: boolean;
  autoRunArgs?: A;
  areEqual?: EqualityFn<S>;
  subscriptionKey?: string;
  selector?: UseSelector<T, A, E, S>;
  events?: UseAsyncStateEvents<T, A, E>;

  condition?:
    | boolean
    | ((
        state: State<T, A, E>,
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
