---
sidebar_position: 1
sidebar_label: TL;DR
---
# TL;DR


## `useAsyncState`

```typescript
const {
  read, // returns the selected value and suspends when pending
  state, // The selected portion of the state
  lastSuccess, // the latest registered success state
  version, // the version of the state, incremented at each update
  source, // a special object hiding the state instance and manipulates it
  
  key, // the key of the related state instance
  uniqueId, // the uniqueId of the state instance
  getState, // gets the current state
  setState, // sets state and notifies all subscribers
  run, // runs the producer and returns the abort function
  runp, // runs the producer and returns a promise to the run's resolve
  runc, // runs the producer with onSuccess, onError and onAborted callbacks
  replay, // replays the latest run if exists, or else does nothing
  abort, // aborts the current run or clears the abort callbacks if any
  replaceProducer, // replaces the producer linked to the state
  getLaneSource, // gets the source of a child
  removeLane, // removes a lane
  invalidateCache, // invalidates a cache entry or the whole cache
  replaceCache, // replaces a cache entry
  mergePayload, // merges a partial payload inside the state instance's payload
  subscribe, // subscribes with a callback to state changes
  getConfig, // gets the current used config
  patchConfig, // patches the config related to the producer

  flags, // the subscription mode: listen, source, hoist, ...
  devFlags, // the subscription mode: listen, source, hoist, ...
} = useAsyncState({
  key, // the subscription key or the definition key
  lane, // the lane instance to use
  source, // the source object received from createSource or a subscription
  payload, // the payload to merge in the instance
  producer, // the producer to be defined in the state instance
  skipPendingDelayMs, // skips the pending status under that delay in Ms
  skipPendingStatus, // never sets the status to pending, it will always notify only about resolve/abort
  cacheConfig: {
    enabled, // whether to enable cache or not
    getDeadline, // get the cache deadline for a succeeded state
    hash, // hashes the run task to add a cache entry
    persist, // persists the whole cache
    load, // loads the cache
    onCacheLoad, // callback called when cache loads
  },
  runEffect, // the effect to apply on runs (debounce, delay, throttle..)
  runEffectDurationMs, // the duration of the run effect in Ms
  resetStateOnDispose, // whether to reset state to initial status when no subscribers are left
  initialValue, // the initial value when creating an instance
  fork, // whether to fork in provider from the given instnace
  forkConfig: {
    key, // the key to give to the new instance
    keepState, // copy the state from the initial instance
    keepCache, // copy the cache from the initial instance
  },
  hoist, // whether to hoist the instance to the nearest provider
  hoistConfig: {
    override, // whether to override any existing instance
  },
  lazy, // whether to automatically run the producer if the condition is truthy
  autoRunArgs, // the args to give to the producer when auto running
  condition, // whether should auto run or not
  areEqual, // compares the previous and next selected value when state changes
  subscriptionKey, // the subscription key that will appear in devtools for this usage
  selector, // the selector
  events: { // registers events
    change: { // called whenever state changes, may be a function, an object, or an array of either
      status, // the status at which this event should be invoked
      handler, // the event handler
    }, // | (newState: State<T>) => void,
    // called when the subscription to the state instance occurs,
    // may be used to attach global events such as focus, scroll etc
    subscribe, // may be a function or an array of them
  },
});
```

## `producer`

```typescript
function myProducer<T>({
  payload, // the payload held by the state instance
  args, // the array of args given to the run function
  onAbort, // registers abort/cleanup callbacks
  isAborted, // returns whether this run was aborted
  getState, // gives the current state at any point of time (may be used before emit)
  emit, // replaces state, works after resolve to support streaming/incremental resolve
  abort, // will abort its own run, if resolved
  lastSuccess, // the last success that was registered before this call, useful for reducers & infinite data
  run, // runs a source or an instance or a producer and returns the abort function
  runp, // runs a source or an instance or a producer and returns a promise to resolve
  select, // selects from source or provider the current state of any state instance
}) {
  return T | Promise<T>;
}
```

## `createSource`

```typescript
const source = createSource(
  "my key",
  myProducer,
  {
    initialValue, // the initial value, may be a function receiving cache a state setter
    runEffect, // the effect to apply on runs (debounce, delay, throttle..)
    runEffectDurationMs, // the duration of the run effect in Ms
    resetStateOnDispose, // whether to reset state to initial status when no subscribers are left
    skipPendingDelayMs, // skips the pending status under that delay in Ms
    skippendingStatus, // skips totally any pending status
    hideFromDevtools, // hides this state from the devtools
    cacheConfig: {
      enabled, // whether to enable cache or not
      getDeadline, // get the cache deadline for a succeeded state
      hash, // hashes the run task to add a cache entry
      persist, // persists the whole cache
      load, // loads the cache
      onCacheLoad, // callback called when cache loads
    },
  }
);

const {
  key, // the key of the related state instance
  uniqueId, // the uniqueId of the state instance
  getState, // gets the current state
  setState, // sets state and notifies all subscribers
  run, // runs the producer and returns the abort function
  runp, // runs the producer and returns a promise to the run's resolve
  runc, // runs the producer with onSuccess, onError and onAborted callbacks
  replay, // replays the latest run if exists, or else does nothing
  abort, // aborts the current run or clears the abort callbacks if any
  replaceProducer, // replaces the producer linked to the state
  getLaneSource, // gets the source of a child
  removeLane, // removes a lane
  invalidateCache, // invalidates a cache entry or the whole cache
  replaceCache, // replaces a cache entry
  mergePayload, // merges a partial payload inside the state instance's payload
  subscribe, // subscribes with a callback to state changes
  getConfig, // gets the current used config
  patchConfig, // patches the config related to the producer
} = source;
```
