---
sidebar_position: 1
sidebar_label: TL;DR
---
# TL;DR

```typescript
const {
  key, // The key of the state
  uniqueId, // the unique id of the state instance, for debugging purposes
  state, // The selected portion of the state
  read, // returns the selected value and suspends when pending
  version, // the version of the state, incremented at each update
  lastSuccess, // the latest registered success state
  source, // a special object hiding the state instance and manipulates it
  mode, // the subscription mode: listen, source, hoist, ...
  payload, // a capture of the payload of the state instance
  replay, // replays the latest run, or does nothing
  abort, // aborts the current run, or does nothing
  run, // runs the producer, if not present, replaces the state
  replaceState, // immediately replace the state value
  mergePayload, // merges a partial payload inside the instance's payload
  invalidateCache, // invalidates a cache entry or the whole cache
} = useAsyncState({
  key, // the subscription key or the definition key
  lane, // the lane instance to use
  source, // the source object received from createSource or a subscription
  payload, // the payload to merge in the instance
  producer, // the producer to be defined in the state instance
  skipPendingDelayMs, // skips the pending status under that delay in Ms
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
  hoistToProvider, // whether to hoist the instance to the nearest provider
  hoistToProviderConfig: {
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
    },
    // called when the subscription to the state instance occurs,
    // may be used to attach global events such as focus, scroll etc
    subscribe, // may be a function or an array of them
  },
});
```
