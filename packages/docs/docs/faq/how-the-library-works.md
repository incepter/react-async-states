---
sidebar_position: 2
sidebar_label: How the library works
---

# How the library works

This section should be relevant only if you wish to contribute to the library,
or you are looking for inspiration, or may be a curious guys that wants to know
the under the hood of things.

## `AsyncState`

The library, like so many others, uses the publisher/subscriber design pattern
naively without any intelligence (for now).

The library stores the state in an object from a constructor called `AsyncState`
, when the state updates, the subscribed components schedule a rerender.

Here is the whole `AsyncStateInterface` definition:

```typescript
interface AsyncStateInterface<T> {
  // new (key: AsyncStateKey, producer: Producer<T>, config: ProducerConfig<T>) : {},
  // properties
  key: AsyncStateKey,
  uniqueId: number | undefined,
  _source: AsyncStateSource<T>,

  currentState: State<T>,
  lastSuccess: State<T>,

  cache: { [id: AsyncStateKey]: CachedState<T> }
  invalidateCache: (cacheKey?:
    string) => void,

  payload: { [id: string]: any } | null,
  config: ProducerConfig<T>,

  subscriptions: { [id: number]: StateSubscription<T> },

  suspender: Promise<T> | undefined,
  producer: ProducerFunction<T>,
  producerType: ProducerType,
  readonly originalProducer: Producer<T> | undefined,

// prototype functions
  dispose: () => boolean, abort: (reason: any) => void,
  replaceState: StateUpdater<T>,
  setState: (newState: State<T>, notify?: boolean) => void,
  run: (extraPropsCreator: RunExtraPropsCreator<T>, ...args: any[]) => AbortFn,
  fork: (forkConfig?: ForkConfig) => AsyncStateInterface<T>,
  subscribe: (cb: Function, subscriptionKey?: AsyncStateKey) => AbortFn,
}

```

When constructed, the async state performs the following actions:

- Initialize its properties
- Wraps the given producer function with the library's logic
- Loads cache (is asynchronous, `.then`)

### `run`

The `run` function declares some closure variables that it will be using,
declares the props object and add running from producer capabilities, the emit
function, the array of scheduled abort callbacks and declares also the abort
function and binds it to the instance as `currentAborter`.

Then it calls your producer, and returns the abort callback. The abort callback
gets invalidated once the producer resolves.

```typescript
function runImmediately(
  extraPropsCreator: RunExtraPropsCreator<T>,
...execArgs: any[]
): AbortFn
{
  if (this.currentState.status === AsyncStateStatus.pending) {
    this.abort();
    this.currentAborter = undefined;
  } else if (isFn(this.currentAborter)) {
    this.abort();
  }

  let onAbortCallbacks: AbortFn[] = [];

  if (this.isCacheEnabled()) {
    // cache logic
  }

  const props: ProducerProps<T> = {
    emit,
    abort,
    args: execArgs,
    aborted: false,
    lastSuccess: that.lastSuccess,
    payload: shallowClone(that.payload),
    onAbort(cb: AbortFn) {
      if (isFn(cb)) {
        onAbortCallbacks.push(cb);
      }
    },
  };
  Object.assign(props, extraPropsCreator(props));

  function emit(
    updater: T | StateFunctionUpdater<T>,
    status?: AsyncStateStatus
  ): void {
    // warning and quit execution
    that.replaceState(updater, status);
  }

  function abort(reason: any): AbortFn | undefined {
    // ... abort logic
    onAbortCallbacks.forEach(function clean(func) {
      invokeIfPresent(func, reason);
    });
    that.currentAborter = undefined;
  }

  this.currentAborter = abort;
  this.producer(props);
  return abort;
}
```

Before doing any of that, the run checks on the config, whether it should apply
some effects, like `debounce` and `throttle`.

```typescript
const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

if (!areRunEffectsSupported() || !this.config.runEffect || effectDurationMs === 0) {
  return this.runImmediately(extraPropsCreator, ...args);
} else {
  return this.runWithEffect(extraPropsCreator, ...args);
}
```

The library when running with cache enabled, if it finds the hashed value it
just sets it as state.

```typescript
if (this.isCacheEnabled()) {
  const runHash = hash(execArgs, this.payload, this.config.cacheConfig);
  const cachedState = this.cache[runHash];

  if (cachedState) {
    if (didNotExpire(cachedState)) {
      if (cachedState.state !== this.currentState) {
        this.setState(cachedState.state);
      }
      return;
    } else {
      delete this.cache[runHash];
    }
  }
}
```

The function that wraps your producer function supports thenables and async
await and promises and generators, and even a falsy value, which falls back
to `replaceState`
```typescript
try {
  executionValue = asyncState.originalProducer(props);
} catch (e) {}

if (isGenerator(executionValue)) {
  // complicated logic that deserves a page of its own
} else if (isPromise(executionValue)) {
  setState(StateBuilder.pending(savedProps))
} else {
  setState(StateBuilder.success(executionValue, savedProps))
  return
}

runningPromise
  .then(stateData => {
    let aborted = props.aborted;
    if (!aborted) {
      props.fulfilled = true;
      setState(StateBuilder.success(stateData, savedProps));
    }
  })
  .catch(stateError => {
    let aborted = props.aborted;
    if (!aborted) {
      props.fulfilled = true;
      setState(StateBuilder.error(stateError, savedProps));
    }
  });

```

### `replaceState`

`replaceState` replaces the state imperatively with a state updater function
(or value) and the desired status. It aborts any pending runs.

```typescript
function replaceState(
  newValue: T | StateFunctionUpdater<T>,
  status = AsyncStateStatus.success
): void {
  if (!StateBuilder[status]) {
    throw new Error(`Couldn't replace state to unknown status ${status}.`);
  }
  if (this.currentState.status === AsyncStateStatus.pending) {
    this.abort();
    this.currentAborter = undefined;
  }

  let effectiveValue = newValue;
  if (isFn(newValue)) {
    effectiveValue = (newValue as StateFunctionUpdater<T>)(this.currentState);
  }

  const savedProps = cloneProducerProps({
    args: [effectiveValue],
    lastSuccess: this.lastSuccess,
    payload: shallowClone(this.payload),
  });
  this.setState(StateBuilder[status](effectiveValue, savedProps));
}
```


### `dispose`

Each subscribing component disposes of the async state when it no longer uses
it, when it reaches zero subscribers, the async state returns to its initial
state.

## `Source`

The source object is constructed from the `AsyncState`'s instance.

It is a javascript object having a key and uniqueId, and a hidden property that
holds a reference to the async state instance itself.

That property is pretty well hidden using a constructor created in a closure
using a weak map vault with a private key static object.

The library knows how to read that source object and how to subscribe to it.

May be in the future, this source object is very compatible
with `useSyncExternalStore`
and we could add new hooks supporting this shortcut.

When used with `useAsyncState`, it no longer cares whether its inside provider
or not, it just subscribes to the async state instance.

## `AsyncStateProvider`
