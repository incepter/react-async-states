---
sidebar_position: 2
sidebar_label: How the library works ?
---

# How the library works ?

## How this section works ?

This section should be relevant only if you wish to contribute to the library,
or you are looking for inspiration, or may be a curious guys that wants to know
the under the hood of things.

It will describe how the core and main features of the library are working.

## How `AsyncState` works ?

The library, like so many others, uses the publisher/subscriber design pattern
naively without any intelligence (for now): It stores the state in an object 
created by a constructor called `AsyncState`, when the state updates,
the subscribed components schedule a rerender (if it is not a component, the
subscriber gets notified).

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
  run: (createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]) => AbortFn,
  fork: (forkConfig?: ForkConfig) => AsyncStateInterface<T>,
  subscribe: (cb: Function, subscriptionKey?: AsyncStateKey) => AbortFn,
}

```

When constructed, the async state performs the following actions:

- Initialize its properties
- Wraps the given producer function with the library's logic
- Loads cache (is asynchronous, `.then`)

### How `setState` works ?
`setState` is the only part where we `change` the `AsyncState.currentState`
property and notify subscribers.

It also does the following:
- If it is a success:
  - update `AsyncState.lastSuccess` property
  - if cache is enabled
    - calculate the hash from args and payload the props and save it
    - if `persiste` is provided, it is called with the whole cache.
  - if status isn't `pending`
    - empty the `suspender` property (the pending promise)

`setState` always notifies subscribes, which are react components. the logic
about scheduling any updates is left to react for the moment (and I do believe
it should stay like that.)

### How `run` works ?

The `run` function declares some closure variables that it will be using,
declares the props object and add running from producer capabilities, the emit
function, the array of scheduled abort callbacks and declares also the abort
function and binds it to the instance as `currentAborter`.

Then it calls your producer, and returns the abort callback. The abort callback
gets invalidated once the producer resolves.

```typescript
function runImmediately(
  createProducerEffects: ProducerEffectsCreator<T>,
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
    // (...) cache logic
  }

  const props: ProducerProps<T> = {
    emit,
    abort,
    args: execArgs,
    lastSuccess: that.lastSuccess,
    payload: shallowClone(that.payload),
    onAbort(cb: AbortFn) {
      if (isFn(cb)) {
        onAbortCallbacks.push(cb);
      }
    },
    isAborted() {
      return indicators.aborted;
    }
  };
  Object.assign(props, createProducerEffects(props));

  function emit(
    updater: T | StateFunctionUpdater<T>,
    status?: AsyncStateStatus
  ): void {
    // (...) warning and quit execution
    that.replaceState(updater, status);
  }

  function abort(reason: any): AbortFn | undefined {
    // (...) abort logic
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
  return this.runImmediately(createProducerEffects, ...args);
} else {
  return this.runWithEffect(createProducerEffects, ...args);
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
export function wrapProducerFunction<T>(asyncState: AsyncState<T>): ProducerFunction<T> {
  return function producerFuncImpl(props: ProducerProps<T>, indicators: RunIndicators): undefined {
    if (typeof asyncState.originalProducer !== "function") {
      replaceState(props.args[0]);
      return;
    }
    try {
      executionValue = asyncState.originalProducer(props);
    } catch (e) {
      // (...)
    }

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
        let aborted = indicators.aborted;
        if (!aborted) {
          indicators.fulfilled = true;
          setState(StateBuilder.success(stateData, savedProps));
        }
      })
      .catch(stateError => {
        let aborted = indicators.aborted;
        if (!aborted) {
          indicators.fulfilled = true;
          setState(StateBuilder.error(stateError, savedProps));
        }
      });
  }
}
```

Beside all of that, the `run` function performs an interesting thing:
It adds to the `props` some properties while referencing the `props` itself.
This allows the library's `props.run` to inherit the context behavior:
When doing `props.run`, it needs to run a producer, and provide a `props` object
which may `select` from a provider, this power should be cascaded on runs.

That's why `ProducerEffects` exists:
It allows the library to cascade the props:
- If you run a producer from provider, all cascading calls via `props.run`
  and `props.runp` and `props.select` are context aware and may support
  using just a `string` to interact with the library.
- If you run from outside the provider, that power vanishes and you are only
  able to run producers unaware of the context, but you may use plain functions
  as producers and use the `Source` object.

```typescript

export function createProducerEffectsCreator(manager: AsyncStateManagerInterface) {
  return function closeOverProps<T>(props: ProducerProps<T>): ProducerEffects {
    return {
      run: createRunFunction(manager, props),
      runp: createRunPFunction(manager, props),
      select: createSelectFunction(manager),
    };
  }
}

export function standaloneProducerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects {
  return {
    run: createRunFunction(null, props),
    runp: createRunPFunction(null, props),
    select: createSelectFunction(null),
  };
}

```

### How `replaceState` works ?

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

### How `dispose` works ?

Each subscribing component disposes of the async state when it no longer uses
it, when it reaches zero subscribers, the async state returns to its initial
state.
```typescript
function dispose() {
  if (this.locks > 0) {
    return false;
  }

  this.abort();
  clearSubscribers(this as AsyncStateInterface<T>);

  this.locks = 0;
  this.setState(StateBuilder.initial(
    typeof this.config.initialValue === "function" ? this.config.initialValue() : this.config.initialValue
  ));

  return true;
}

```
## How `Source` works ?

The source object is constructed from the `AsyncState`'s instance.
```typescript
// AsyncState constructor
this._source = makeSource(this);
```

It is a javascript object having a key and uniqueId, and a hidden property that
holds a reference to the async state instance itself.

```typescript

function constructAsyncStateSource<T>(
  asyncState: AsyncStateInterface<T>
): AsyncStateSource<T> {
  return objectWithHiddenProperty(asyncStatesKey, asyncState);
}

```

That property is pretty well hidden using a constructor created in a closure
using a weak map vault with a private key static object.

The library knows how to read that source object and how to subscribe to it.
It adds a non-enumerable `Symbol` to detect fastly that it is a Source object.
But later, it tries to read the value and may throw if it is not a valid source.

May be in the future, this source object is very compatible
with `useSyncExternalStore`
and we could add new hooks supporting this shortcut.

When used with `useAsyncState`, it no longer cares whether its inside provider
or not, it just subscribes to the async state instance.

## How `AsyncStateProvider` works ?
The `AsyncStatProvider`'s goal is to allow subscription via `string` keys and 
allows waiting for an `AsyncState` and `hoisting` at runtime.

The provider adds a tremendous power to the library.
It creates a `Manager` which is similar to an instance from the `initialStates` 
provided.

The manager is what it does all the context's work.

```typescript
function makeContextValue(): AsyncStateContextValue {
    return {
      manager,
      payload: shallowClone(payload),

      get: manager.get,
      run: manager.run,
      fork: manager.fork,
      hoist: manager.hoist,
      watch: manager.watch,
      select: manager.select,
      dispose: manager.dispose,
      watchAll: manager.watchAll,
      getAllKeys: manager.getAllKeys,
      runAsyncState: manager.runAsyncState,
      notifyWatchers: manager.notifyWatchers,
      producerEffectsCreator: manager.producerEffectsCreator,
    };
  }
```

The manager's instance and methods are stable and __**NEVER**__ change, only
the payload that may change, and it only depends on the developer.

If contributing, you shouldn't care about putting the manager's methods in
as dependencies, because they are stable and fix.

As you may notice, the power of the provider is in the `Manager`.

It holds the wired async states and manages their change, it holds two types
of watchers, watchers that watch over an exact async state, and watchers that
watch anything happening to the async states (hoisting and removal).

The watchAll method is used by `useSelector` when its argument is a
function, that function may want to select from any possible async state
that passes through the provider, so it needs to be notified when something
is added (`hoisted`), that's why `watchAll` exists in a nutshell.
It simply uses a special symbol as a record to save watchers into it.

```typescript
const asyncStateEntries: AsyncStateEntries = Object
    .values(initializer ?? EMPTY_OBJECT)
    .reduce(
      createInitialAsyncStatesReducer,
      Object.create(null)
    ) as AsyncStateEntries;

  // stores all listeners/watchers about an async state
  let watchers: ManagerWatchers = Object.create(null);

  const output: AsyncStateManagerInterface = {
    entries: asyncStateEntries,
    run,
    get,
    fork,
    hoist,
    watch,
    select,
    dispose,
    watchers,
    watchAll,
    getAllKeys,
    runAsyncState,
    notifyWatchers,
    setInitialStates
  };
  output.producerEffectsCreator = createProducerEffectsCreator(output);

  return output;
```

When notifying for updates, the provider closes over the current watchers and
delays using `Promise.resolve()` and invokes the gathered callbacks. Each callback
of course checks whether it is still relevant or has been cleared.

And also, the notification is scheduled mainly when rendering. If you choose
to hoist a state to the provider, then watchers and allWatchers should be notified,
if it occurs in a sync way it would break the react's mental model. So we wait
until react unlocks to give us control, and then we schedule updates.

## How `useAsyncState` works ?
The `async` part of its name doesn't represent its true nature, and it exists
just because the main goal is to subscribe to the `AsyncState` instacne.
If I were to rename it anew, I would rather choose `useSharedState` or `useBetterState`.  

`useAsyncState` is by no doubts an interesting hook, in fact, that's what it does:
- Declare a state guard to force updates
- Determines whether it is in provider (this grant the props run extra props)
- Parses the user configuration and get a subscription info at each dependencies change
  - parse the first argument and infer a full configuration object supported by
    the library.
  - infer the subscription mode from the configuration with help of the context value
  - give an automatic key is omitted
  - checks whether it should recalculate the `AsyncState` instance based on the
    new configuration, the new mode, the state guard and the whole old 
    subscription info that's kept in a `useMemo`'s value
    - recalculate the async state instance if needed or take the one on the
      old subscription info.
  - construct the subscription info with the guard, mode, dependencies,
    asyncState and the calculated run and dispose functions.
  - merges the payload from the user configuration and the one in context,
    if applied.
- If rendering with a different async state, reselect state value
  and reschedule an update.
- Saves the subscription info in the old subscription info.
- Adds `subscribe` effect with `[asyncState, selector, areEqual]` dependencies
- Adds `autoRunEffect` effect with the given dependencies
- Adds `disposeOldAsyncState` effect with dispose function as dependency
- If inside provider, watch over async state with mode and key as dependencies.

That's how `useAsyncState` works. It is no magic.

`useAsyncState`'s power comes directly from the React's model: effects around
dependencies. If fact, it allows synchronizing dependencies to do a job.
And of course, it subscribes or waits for the `AsyncState`'s instance that's
holding our state, then it renders whenever that state notifies us to update
(it always notifies!).

`useAsyncState` also exposes some power of `AsyncState`: replaceState, abort... and so on.

When the subscription occurs, `events.subscribe` is called which receives a
`getState` and `run` methods along with the subscription mode and invalidateCache.

This should allow all platforms to bind specific event listeners and/or perform
some logic: like `focus`, `scroll` or any other event on any platform.

### How `useAsyncState` subscription config works ?
The exposed `useAsyncState`'s signature is the following:
```typescript
function useAsyncStateExport<T, E>(
  subscriptionConfig: UseAsyncStateConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies
  );
}
```
The subscription config may be:
- A `Source` object.
- A `string` key
- A `Producer`
- A configuration object with supported properties

Here is how the library parses -**__`in order`__**- the user configuration:
- If it is a `function` (a `Producer` then) creates default configuration with
  the given `producer` property.
- If it is a `string` (a `key` then) creates default configuration with
  the given `key` property.
- If it is a `Source` (a `Source` then) creates default configuration with
  the given `source` property, and a `Symbol` to detect that it is a Source config.
- If `config?.source` it is a `Source` (a `Source` then) creates default 
  configuration with the given `source` property, and a `Symbol` 
  to detect that it is a Source config.
- Fallback with the default configuration.

The default configuration is:

```typescript
Object.freeze({
  lazy: true,
  condition: true,

  areEqual: shallowEqual,
  selector: oneObjectIdentity,
})
```

### How `useAsyncState` subscription mode works ?

Then, after parsing the whole configuration, here is how the library
determines -**__`in order`__**- the `SubscriptionMode`:
- If a source object is given, go `SOURCE` or `SOURCE_FORK` given the configuration
- If outside provider, go `OUTSIDE_PROVIDER`
- If no key is provided, go `STANDALONE`
- If the given key exists in provider and we aren't hoisting nor forking, go `LISTEN`
- If we aren't hoisting nor forking, but providing a `producer`, go `STANDALONE`
- If we are hoisting and (not yet in provider or not forking), go `HOIST
- If we are forking and it exists in provider, go `FORK`.
- If It does not exist in provider, go `WAITING`
- go `NOOP`, this should not happen, and left to highlight a possible bug in the library.

### How `useAsyncState` subscription to `AsyncState` works ?
Here is the whole subscription effect:

```typescript
function subscribeToAsyncState(): CleanupFn {
  if (!asyncState) { // do nothing on noop and waiting modes
    return undefined;
  }

  let didClean = false;
  // subscribe returns the unsubscribe function
  const unsubscribe = asyncState.subscribe(
    function onUpdate() {
      if (didClean) {
        return;
      }
      const newState = readStateFromAsyncState(asyncState, selector);

      // schedule an update to react, everytime
      // react should bail out updates when the old value is re-applied
      setSelectedValue(old => {
        return areEqual(old.state, newState)
          ? old
          :
          makeUseAsyncStateReturnValue(
            asyncState,
            newState,
            configuration.key as AsyncStateKey,
            run,
            mode
          )
      });
    },
    configuration.subscriptionKey
  );
  let postUnsubscribe: CleanupFn[] | undefined;
  if (events?.subscribe) {
    postUnsubscribe = [];

    let subscribeHandlers: ((props: SubscribeEventProps<T>) => CleanupFn)[];

    if (Array.isArray(events.subscribe)) {
      subscribeHandlers = events.subscribe;
    } else {
      subscribeHandlers = [events.subscribe];
    }

    postUnsubscribe = subscribeHandlers.map(ev => ev({
      run,
      mode,
      getState: () => asyncState.currentState,
      invalidateCache: asyncState.invalidateCache.bind(asyncState),
    }));
  }
  return function cleanup() {
    didClean = true;
    invokeIfPresent(postUnsubscribe);
    (unsubscribe as () => void)();
  }
}
```
I can't explain it better than itself.

## Until we meet again
That's it for now. Please let me know if I should any other relevant information
about how the library handles it.

<img alt="jkj" src="https://i.imgflip.com/5ji7nm.jpg" />
