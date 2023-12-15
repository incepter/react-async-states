---
sidebar_position: 2
sidebar_label: Create source
---
# createSource

`createSource` is a function that creates shared states.
It accepts three parameters:

| Property        | Type                      | Description                         |
|-----------------|---------------------------|-------------------------------------|
| `key`           | `string`                  | The unique identifier of the state  |
| `producer`      | `Producer<T, A, E>`       | Returns the state value of type `T` |
| `configuration` | `ProducerConfig<T, A, E>` | The configuration of the state      |

## Signature

`createSource` is defined and used as follows:

```tsx
export function createSource<T, A extends unknown[] = [], E = Error>(
  key: string,
  producer?: Producer<T, A, E> | undefined | null,
  config?: ProducerConfig<T, A, E>
): Source<T, A, E>;


let counter = createSource("counter", null, { initialValue: 0 });
let userDetails = createSource("user-details", fetchUserDetailsProducer, {
  runEffect: "debounce",
  runEffectDurationMs: 300,
  skipPendingDelayMs: 200,
  // ... other config we'll see in a few
});

```

### key
The key is a plain string and unique identifier of the state.

Giving the same key to multiple times to createSource will return the same
source object.

### producer
The producer was detailed in [the previous section](/docs/api/producer-function).
## Configuration

The whole configuration is optional.

### `initialValue`

```tsx
// T = TData, A = TArgs, E = TError
type typeOfInitialValue = T | ((cache: Record<string, CachedState<T, A, E>> | null) => T)
```

The initial value held by the state when status is `initial`.

It can be also a function that allows you to initialize the state from the cache.
More on cache later.

### `runEffect`
```tsx
type RunEffect = "debounce" | "throttle";
```

The effect to apply when running the producer.
It is either `debounce` or `throttle`.

:::note
The run effect isn't applied if `runEffectDurationMs` isn't given or is `0`.
:::

### `runEffectDurationMs`
```tsx
type runEffectDurationMs = number;
```
The `runEffect` duration in milliseconds.
### `skipPendingDelayMs`
```tsx
type skipPendingDelayMs = number;
```
The delay in `ms` under which the transition to `pending` state is skipped.
This comes in handy when you the request may be very fast and you don't want
to show a pending indicator if so.
### `keepPendingForMs`
```tsx
type skipPendingDelayMs = number;
```
This is the reserve of the previous property, if you enter the `pending` state,
it prevents any further updates until this delay is passed, to avoid showing the
pending indicator for few milliseconds for example.

It reads as: If you enter the pending state, stay in it at least for this value.
### `skipPendingStatus`
```tsx
type skipPendingStatus = boolean;
```
This will prevent your state to have a pending state at all.
### `cacheConfig`
```tsx
type CacheConfig<T, A extends unknown[], E> = {
  enabled: boolean;
  timeout?: ((currentState: State<T, A, E>) => number) | number;
  hash?(
    args: A | undefined,
    payload: Record<string, unknown> | null | undefined
  ): string;
  auto?: boolean;
  persist?(cache: Record<string, CachedState<T, A, E>>): void;
  load?():
    | Record<string, CachedState<T, A, E>>
    | Promise<Record<string, CachedState<T, A, E>>>;
  onCacheLoad?({ cache, setState }: OnCacheLoadProps<T, A, E>): void;
}
```
The library supports caching state values, but it is opt-in and not
enabled by default.
#### `enabled`
Will enable cache for this state.
#### `timeout`
The duration under which the cached state is considered still valid.

If this value is omitted, first, the library will check if you have a
`cache-control` header with a `max-age` defined. If present it will be used.
Or else, `Infinity` is used.
#### `auto`
Indicates that we should automatically re-run the producer to get a new value
after timeout is elapsed.
:::note
- `auto` doesn't work with `Initity`.
- `auto` will remove the cached state from cache.
- `auto` will only run again if the removed cached state is the current state.
:::
#### `hash`
Each cached state is identified by a `string` hash that's computed by this
function. If omitted, it is calculated automatically like this:

```tsx
export function defaultHash<A extends unknown[]>(
	args: A | undefined,
	payload: Record<string, unknown> | null | undefined
): string {
	return JSON.stringify({ args, payload });
}
```
#### `persist`
Called everytime a new cache entry is added or removed. Its purpose is to allow
you to persist the cache then load it later. In local storage for example.
#### `load`
Loads the cache when the state is constructed
#### `onCacheLoad`
A callback fired when the cache is loaded.
### `retryConfig`
When running the producer and it fails, you can retry it.
```tsx
type RetryConfig<T, A extends unknown[], E> = {
  enabled: boolean;
  maxAttempts?: number;
  backoff?: number | ((attemptIndex: number, error: E) => number);
  retry?: boolean | ((attemptIndex: number, error: E) => boolean);
};
```
#### `enabled`
Opt into retry, this is not enabled by default.
#### `maxAttempts`
Defines the max retries to perform per run.
#### `backoff`
The backoff between retries.
#### `retry`
A boolean or a function that receives the current attempt count and the error
and returns whether we should retry or not.
### `resetStateOnDispose`
```tsx
type resetStateOnDispose = boolean;
```
The `dispose` event is when all subscribers unsubscribe from a state.

If this property is `true`, the state will be altered to its initial value.
### `context`
This is a plain object, it should be a valid `WeakMap` key.

To perform isolation and allowing to have multiple states with the same key,
in the server for example, the `context` api comes in.

When provided, the state will be created and only visible to that `context`.

### `storeInContext`
If this is provided and is `false`, the state instance won't be stored in its
context.

### `hideFromDevtools`
Defines whether to show this state in the devtools or not.

## The `Source`

The resulting object from `createSource` has the following shape:

### `key`
The used key to create the state.
### `uniqueId`
Each state has a unique id defining it. This is an auto incremented number.
### `getState`
returns the current state.
### `setState`
Will alter the state to the desired value with the given status.
The updater can be either a value or a function that will receive the current
state.
```tsx
setState(
  updater: StateFunctionUpdater<T, A, E> | T,
  status?: Status,
  callbacks?: ProducerCallbacks<T, A, E>
): void;
```

### `getVersion`
The library implements an optimistic lock internally via a value that is
auto-incremented each time the state changes.

```tsx
getVersion(): number;
```

### `run`
Allows you to run the `producer` with the given args.

It returns a function that will abort the related run.
```tsx
run(...args: TArgs): AbortFn;
```
### `runc`

```tsx
runc(
  props: {
    args?: TArgs,
    onSuccess?(successState: SuccessState<TData, TArgs>): void;
    onError?(errorState: ErrorState<TData, TArgs, TError>): void;
  }
): AbortFn;
```

Will run the producer with the given `args` and executed the given callbacks.

It returns a function that will abort the related run.

### `runp`
```tsx
runp(...args: A): Promise<State<TData, TArgs, TError>>;
```

Similar to `run`, but returns a Promise to resolve.

This promise resolves even if the producer throws, and gives you a state with
error status in this case.
### `replay`
```tsx
replay(): AbortFn;
```
Will run again using the latest `args` and `payload`.

### `abort`
```tsx
abort(reason?: any): void;
```
Will call any registered abort callbacks from the latest run.

If a run is pending, it will be aborted and the previous state is restored.
### `replaceProducer`
```tsx
replaceProducer(newProducer: Producer<T, A, E> | null): void;
```
Allows you to replace the producer of a state.
### `getConfig`
```tsx
getConfig(): ProducerConfig<T, A, E>;
```
Returns the current config held by the state instance.
### `patchConfig`
```tsx
patchConfig(partialConfig?: Partial<ProducerConfig<T, A, E>>): void;
```
Allows you to partially add config to the defined state.
### `getPayload`
The payload is a mutable area inside the state that's accessible anytime,
anywhere and by all subscribers.
```tsx
getPayload(): Record<string, unknown>;
```
Returns the payload object. If not defined, it will be initialized by an empty
object then returned.
### `mergePayload`
```tsx
mergePayload(partialPayload?: Record<string, unknown>): void;
```
Adds the given payload to the existing payload inside the instance.
### `subscribe`
```tsx
subscribe(cb: (s: State<T, A, E>) => void): UnsubscribeFn;
```
Allows you to subscribe to state updates in this state.

:::note
If you are using hooks, you won't need this.
:::
### `invalidateCache`
```tsx
invalidateCache(cacheKey?: string): void;
```
Will invalidate an entry from the cache by its key.

It the cache key is omitted, the whole cache is removed.
### `replaceCache`
```tsx
replaceCache(cacheKey: string, cache: CachedState<T, A, E>): void;

type CachedState<T, A extends unknown[], E> = {
  state: State<T, A, E>;
  addedAt: number;
  deadline: number;
  // when auto refresh is enabled, we store its timeoutid in this
  id?: ReturnType<typeof setTimeout>;
};
```
Replaces a single cache entry.
### `on`
```tsx
on(
  eventType: InstanceChangeEvent,
  eventHandler: InstanceChangeEventHandlerType<T, A, E>
): () => void;
on(
  eventType: InstanceDisposeEvent,
  eventHandler: InstanceDisposeEventHandlerType<T, A, E>
): () => void;
on(
  eventType: InstanceCacheChangeEvent,
  eventHandler: InstanceCacheChangeEventHandlerType<T, A, E>
): () => void;
```
Allows you to register events for this state instance.

The supported events are:
- `change`: When the state value changes, you receive the new state.
- `cache-change`: When a cache entry changes, you receive the whole cache.
- `dispose`: When disposing the instance occurs.
### `dispose`
```tsx
dispose(): boolean;
```
### `getLane`
`lane`s are `Source` objects attached to the same state instance. They share
the same `cache`.
```tsx
getLane(laneKey?: string): Source<T, A, E>;
```

If the request lane doesn't exist, it is created and returned.
:::warning
The `lane` source's key should be considered as unique too, because it will be
attached to the same context and uses the same config.

If an state with the same lane key already exists, it is returned.
:::
### `hasLane`
```tsx
hasLane(laneKey: string): boolean;
```
Returns true if the source has a lane with that key.
### `removeLane`
```tsx
removeLane(laneKey?: string): boolean;
```
Will detach the lane from its parent.
### `getAllLanes`
```tsx
getAllLanes(): Source<T, A, E>[];
```
Will return all the lanes attached to the source.
