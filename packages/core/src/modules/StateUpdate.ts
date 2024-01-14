import {
  InitialState,
  ProducerCallbacks,
  ProducerProps,
  ProducerSavedProps,
  ReplaceStateUpdateQueue,
  State,
  StateFunctionUpdater,
  StateInterface,
  UpdateQueue,
} from "../types";
import { initial, pending, Status, success } from "../enums";
import { notifySubscribers } from "./StateSubscription";
import { __DEV__, cloneProducerProps, isFunction } from "../utils";
import devtools from "../devtools/Devtools";
import { freeze, now, shallowClone } from "../helpers/core";
import { invokeChangeCallbacks, invokeInstanceEvents } from "./StateEvent";
import { hasCacheEnabled, saveCacheAfterSuccessfulUpdate } from "./StateCache";

let isCurrentlyEmitting = false;
let isCurrentlyAlteringState = false;
let isCurrentlyFlushingAQueue = false;

export function startEmitting() {
  let prevIsEmitting = isCurrentlyEmitting;
  isCurrentlyEmitting = true;
  return prevIsEmitting;
}
export function stopEmitting(restoreToThisValue: boolean) {
  isCurrentlyEmitting = restoreToThisValue;
}

export function isAlteringState() {
  return isCurrentlyAlteringState;
}
export function startAlteringState() {
  let prevIsAltering = isCurrentlyAlteringState;
  isCurrentlyAlteringState = true;
  return prevIsAltering;
}
export function stopAlteringState(restoreToThisValue: boolean) {
  isCurrentlyAlteringState = restoreToThisValue;
}

export function getQueueTail<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
): UpdateQueue<TData, TArgs, TError> | null {
  if (!instance.queue) {
    return null;
  }
  let current = instance.queue;
  while (current.next !== null) {
    current = current.next;
  }
  return current;
}

function addToQueueAndEnsureItsScheduled<
  TData,
  TArgs extends unknown[],
  TError,
>(
  instance: StateInterface<TData, TArgs, TError>,
  update: UpdateQueue<TData, TArgs, TError>
) {
  if (!instance.queue) {
    instance.queue = update;
  } else {
    let tail = getQueueTail(instance);
    if (!tail) {
      return;
    }
    tail.next = update;
  }

  ensureQueueIsScheduled(instance);
}

export function enqueueUpdate<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  newState: State<TData, TArgs, TError>,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
) {
  let update: UpdateQueue<TData, TArgs, TError> = {
    callbacks,
    data: newState,
    kind: 0,
    next: null,
  };
  addToQueueAndEnsureItsScheduled(instance, update);
}

export function enqueueSetState<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  newValue: TData | StateFunctionUpdater<TData, TArgs, TError>,
  status: Status = success,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
) {
  let update: UpdateQueue<TData, TArgs, TError> = {
    callbacks,
    kind: 1,
    data: { data: newValue, status },
    next: null,
  };
  addToQueueAndEnsureItsScheduled(instance, update);
}

export function enqueueSetData<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  newValue: TData | ((prev: TData | null) => TData)
) {
  let update: UpdateQueue<TData, TArgs, TError> = {
    kind: 2,
    data: newValue,

    next: null,
  };
  addToQueueAndEnsureItsScheduled(instance, update);
}

export function ensureQueueIsScheduled<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  if (!instance.queue) {
    return;
  }
  let queue: UpdateQueue<TData, TArgs, TError> = instance.queue;
  if (queue.id) {
    return;
  }
  let delay = instance.config.keepPendingForMs || 0;
  let elapsedTime = now() - instance.state.timestamp;
  let remainingTime = delay - elapsedTime;

  if (remainingTime > 0) {
    queue.id = setTimeout(() => flushUpdateQueue(instance), remainingTime);
  } else {
    flushUpdateQueue(instance);
  }
}

export function flushUpdateQueue<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  if (!instance.queue) {
    return;
  }

  let current: UpdateQueue<TData, TArgs, TError> | null = instance.queue;
  instance.queue = null;

  let prevIsFlushing = isCurrentlyFlushingAQueue;
  isCurrentlyFlushingAQueue = true;

  while (current !== null) {
    // when we encounter a pending state that's not the last one
    // we can safely skip it an process the next update
    let canBailoutPendingStatus =
      current.kind !== 2 && // 2 is for setData
      current.data.status === pending &&
      current.next !== null;

    // so we will only process the updates that we can't skip from the queue
    if (!canBailoutPendingStatus) {
      switch (current.kind) {
        // there update came from replaceState(newWholeState)
        case 0: {
          let { data, callbacks } = current;
          // when the queue isn't empty, there is a caveat that might happen
          // when the path setting the whole state is in the queue.
          // ** It may lead to inconsistency with the timestamp
          // to avoid this, the state object is recreated here.
          let newState = { ...data } as typeof data;
          newState.timestamp = now();
          freeze(newState);
          replaceInstanceState(instance, newState, false, callbacks);
          break;
        }
        // there update came from setState(value, status)
        case 1: {
          let { status, data } = current.data;
          setInstanceState(instance, data, status, current.callbacks);
          break;
        }
        // there update came from setData(value)
        case 2: {
          isCurrentSetStateSettingData = true;
          setInstanceState(instance, current.data, success);
          isCurrentSetStateSettingData = false;
          break;
        }
      }
    }

    current = current.next;
  }

  isCurrentlyFlushingAQueue = prevIsFlushing;

  // always notify after a state update
  notifySubscribers(instance);
}

export function scheduleDelayedPendingUpdate<
  TData,
  TArgs extends unknown[],
  TError,
>(
  instance: StateInterface<TData, TArgs, TError>,
  newState: State<TData, TArgs, TError>,
  notify: boolean
) {
  function callback() {
    // callback always sets the state with a pending status
    if (__DEV__) devtools.startUpdate(instance);
    let clonedState = shallowClone(newState);
    clonedState.timestamp = now();
    instance.state = freeze(clonedState); // <-- status is pending!
    instance.pendingUpdate = null;
    instance.version += 1;
    invokeInstanceEvents(instance, "change");
    if (__DEV__) devtools.emitUpdate(instance, false);

    if (notify) {
      notifySubscribers(instance);
    }
  }

  let timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
  instance.pendingUpdate = { callback, id: timeoutId };
}

export function replaceInstanceState<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  newState: State<TData, TArgs, TError>,
  notify: boolean = true,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
) {
  let { config } = instance;
  let isPending = newState.status === pending;

  if (isPending && config.skipPendingStatus) {
    return;
  }

  if (instance.queue) {
    enqueueUpdate(instance, newState, callbacks);
    return;
  }

  if (
    config.keepPendingForMs &&
    instance.state.status === pending &&
    !isCurrentlyFlushingAQueue
  ) {
    enqueueUpdate(instance, newState, callbacks);
    return;
  }

  // pending update has always a pending status
  // setting the state should always clear this pending update
  // because it is stale, and we can safely skip it
  if (instance.pendingUpdate) {
    clearTimeout(instance.pendingUpdate.id);
    instance.pendingUpdate = null;
  }

  if (
    isPending &&
    config.skipPendingDelayMs &&
    isFunction(setTimeout) &&
    config.skipPendingDelayMs > 0
  ) {
    scheduleDelayedPendingUpdate(instance, newState, notify);
    return;
  }

  if (__DEV__) devtools.startUpdate(instance);
  instance.version += 1;
  instance.state = newState;
  invokeChangeCallbacks(newState, callbacks);
  invokeInstanceEvents(instance, "change");
  if (__DEV__) devtools.emitUpdate(instance, false);

  if (instance.state.status === success) {
    instance.lastSuccess = instance.state;
    if (hasCacheEnabled(instance)) {
      saveCacheAfterSuccessfulUpdate(instance);
    }
  }

  if (notify && !isCurrentlyFlushingAQueue) {
    notifySubscribers(instance as StateInterface<TData, TArgs, TError>);
  }
}

let isCurrentSetStateSettingData = false;
export function setInstanceData<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  newValue: TData | ((prev: TData | null) => TData)
) {
  let previouslySettingData = isCurrentSetStateSettingData;
  isCurrentSetStateSettingData = true;
  setInstanceState(instance, newValue);
  isCurrentSetStateSettingData = previouslySettingData;
}

export function setInstanceState<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  newValue:
    | TData
    | StateFunctionUpdater<TData, TArgs, TError>
    | ((prev: TData | null) => TData)
    | null
    | TError,
  status: Status = success,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
) {
  if (instance.queue) {
    if (isCurrentSetStateSettingData) {
      let update = newValue as TData | ((prev: TData | null) => TData);
      enqueueSetData(instance, update);
      isCurrentSetStateSettingData = false;
      return;
    }
    let update = newValue as TData | StateFunctionUpdater<TData, TArgs, TError>;
    enqueueSetState(instance, update, status, callbacks);
    return;
  }

  let wasAlteringState = startAlteringState();

  if (
    instance.state.status === pending ||
    (isFunction(instance.currentAbort) && !isCurrentlyEmitting)
  ) {
    instance.actions.abort();
    instance.currentAbort = undefined;
  }

  let effectiveValue = newValue;
  if (isFunction(newValue)) {
    // there two possible ways to update the state by updater:
    // 1. the legacy setState(prevState => newData);
    // 2. the new setData(prevData => newData);
    // To avoid duplicating this whole function, a module level variable
    // was introduced to distinguish between both of them
    // this variable is set to true when the call occurs from setData
    if (isCurrentSetStateSettingData) {
      let update = newValue as (prev: TData | null) => TData;
      effectiveValue = update(instance.lastSuccess.data ?? null);
    } else {
      effectiveValue = newValue(instance.state);
    }
  }

  // setting state from this path passes without props as a direct call to
  // setState; which means there are no "props", but we only care about
  // args and payload, so we hack it here like this
  let partialProducerProps = {
    args: [effectiveValue] as TArgs,
    payload: shallowClone(instance.payload),
  } as ProducerProps<TData, TArgs, TError>;

  const savedProps = cloneProducerProps<TData, TArgs, TError>(
    partialProducerProps
  );

  let newState = {
    status,
    timestamp: now(),
    props: savedProps,
    data: effectiveValue,
  } as State<TData, TArgs, TError>;

  // if the next state has a pending status, we need to populate the prev
  // property, we take the previous state, if it was also pending, take
  // its prev and set it as previous.
  if (newState.status === pending) {
    let previousState = instance.state;
    if (previousState.status === pending) {
      previousState = previousState.prev;
    }
    if (previousState) {
      newState.prev = previousState;
    }
  }

  replaceInstanceState(instance, newState, true, callbacks);
  stopAlteringState(wasAlteringState);
}

export function disposeInstance<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  if (instance.subscriptions && Object.keys(instance.subscriptions).length) {
    // this means that this state is retained by some subscriptions
    return false;
  }

  let wasAltering = startAlteringState();

  instance.actions.abort();
  if (instance.queue) {
    clearTimeout(instance.queue.id);
    instance.queue = null;
  }

  let initialState = instance.config.initialValue;
  if (isFunction(initialState)) {
    initialState = initialState(instance.cache);
  }

  let initialSavedProps = {
    args: [initialState as TData],
    payload: shallowClone(instance.payload),
  } as ProducerSavedProps<TData, TArgs>;

  const newState: InitialState<TData, TArgs> = {
    status: initial,
    timestamp: now(),
    data: initialState,
    props: initialSavedProps,
  };

  replaceInstanceState(instance, newState);
  if (__DEV__) devtools.emitDispose(instance);

  stopAlteringState(wasAltering);
  invokeInstanceEvents(instance, "dispose");

  return true;
}
