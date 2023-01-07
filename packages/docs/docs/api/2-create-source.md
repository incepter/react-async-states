---
sidebar_position: 2
sidebar_label: Create source
---
# createSource
`createSource` is a utility provided by the library that creates instances
of shared states.

If used at a module level, it will give you a state that is accessible from
all over your application.

The source object has the following properties:

| Property          | Type                                                              | Description                                                                                   |
|-------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `key`             | `string`                                                          | the provided key of the state instance                                                        |
| `uniqueId`        | `uniqueId`                                                        | the instance's unique Id (auto incremented)                                                   |
| `getState`        | `() => State<T, E, R>`                                            | returns the current state of the source object                                                |
| `setState`        | `(data: T or (prev: State<T, E, R>) => T, status?: Status): void` | replaces the current state with the value or the provided updater function                    |
| `run`             | `(...args: any[]) => AbortFn`                                     | runs the producer with given parameters and return the abort function                         |
| `runp`            | `(...args: any[]) => Promise<T> or undefined`                     | runs the producer with given parameters and return a promise for resolve                      |
| `runc`            | `({ args: any[], onSuccess, onError, onAborted) => AbortFn`       | runs the producer with given parameters and callbacks for resolve, returns the abort function |
| `replay`          | `() => AbortFn`                                                   | replays the latest run and return the abort function                                          |
| `abort`           | `(reason?: R) => void`                                            | aborts the current run if pending or clears the onAbort registered callbacks                  |
| `replaceProducer` | `(producer) => void`                                              | replaces the producer attached with the state                                                 |
| `getLaneSource`   | `(lane: string) => Source`                                        | returns a `source` object for the given lane                                                  |
| `removeLane`      | `(lane: string) => boolean`                                       | returns a lanes source                                                                        |
| `invalidateCache` | `(cacheKey?: string) => boolean`                                  | invalidates the given cache by key or the whole cache                                         |
| `replaceCache`    | `(key: string, cached: CachedState) => void`                      | replaces a cache entry                                                                        |
| `mergePayload`    | `(partialPayload: Record<string, any>) => void`                   | merges a partial payload inside the payload detained by the state                             |
| `subscribe`       | `(cb) => Unsubscribe()`                                           | subscribes to state updates                                                                   |
| `getConfig`       | `() => ProducerConfig`                                            | returns the current configuration of the state                                                |
| `patchConfig`     | `(config: Partial<ProducerConfig>) => void`                       | patches the configuration with the given partial one                                          |


```typescript
import {createSource, useAsyncState, useRun} from "react-async-states";

const connectedUser = createSource("principal", getUserProducer);

// later, at any part of the app
useAsyncState(connectedUser);
// or
useAsyncState({source: connectedUser, ...otherConfig});

// and you can even controle it like this:
const run = useRun();
// from anywhere down in the tree:
run(connectedUser, ...args);
// or simply:
connectedUser.run(...args);

// or even from inside another producer:
props.run(connectedUser, {payload: { userId: 5 }, fork: true,})

// notice that you can define this producer in a way that get's a user
// and when nothing provided can fallback to the current user.
// later, you can re-use a fork of it while providing the user id.
async function getUserProducer(props) {
  // ... setup
  const userId = props.payload?.userId ?? "me";
  // ... return fetch
}
```

`createSource` accepts three parameters:

| Property        | Type                | Description                              |
|-----------------|---------------------|------------------------------------------|
| `key`           | `string`            | The unique identifier of the async state |
| `producer`      | `Producer<T, E, R>` | Returns the state value of type `T`      |
| `configuration` | `ProducerConfig`    | The configuration of the state           |

The supported configuration is:

| Property              | Type                                                         | Description                                                                                                                                                                                           |
|-----------------------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `initialValue`        | `T or  ((cache: Record<string, CachedState<T, E, R>>) => T)` | The initial value or the initializer of the state (status = `initial`), the initializer receives the cache as unique parameter                                                                        |
| `runEffect`           | `oneOf('debounce', 'throttle', undefined)`                   | An effect to apply when running the producer, can be used to debounce or throttle                                                                                                                     |
| `runEffectDurationMs` | `number > 0`, `undefined`                                    | The debounce/throttle duration                                                                                                                                                                        |
| `resetStateOnDispose` | `boolean`                                                    | Whether to reset the state to its initial state when all subscribers unsubscribe or to keep it. Default to `false`.                                                                                   |
| `skipPendingDelayMs`  | `number > 0` or `undefined`                                  | The duration under which a state update with a pending status may be skipped. The component in this case won't render with a pending status if it gets updated to something else under that duration. |
| `skipPendingStatus`   | `boolean`                                                    | Entirely disable the pending status of this state. this state won't step into a pending status                                                                                                        |
| `cacheConfig`         | `CacheConfig<T, E, R>`                                       | The cache config                                                                                                                                                                                      |
| `hideFromDevtools`    | `boolean`                                                    | Hide this state from the devtools                                                                                                                                                                     |

Where the supported cache config is:

| Property      | Type                                                              | Description                                                                      |
|---------------|-------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `enabled`     | `boolean`                                                         | Whether to enable cache or not                                                   |
| `hash`        | `(args?: any[], payload?: Record<string, any> or null) => string` | a function to calculate a hash for a producer run (from args and payload)        |
| `getDeadline` | `(currentState: State<T, E, R>) => number`                        | returns the deadline after which the cache is invalid                            |
| `load`        | `() => {[id: string]: CachedState<T, E, R>}`                      | loads the cached data when the async state instance is created                   |
| `persist`     | `(cache: {[id: string]: CachedState<T, E, R>}) => void`           | a function to persist the whole cache, called when state is updated to success   |
| `onCacheLoad` | `onCacheLoad?({cache, setState}): void`                           | a callback called when the cache loads, useful when asynchronously loading cache |
