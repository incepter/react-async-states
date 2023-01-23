---
sidebar_position: 4
sidebar_label: useAsyncState
---
# `useAsyncState`

## The `useAsyncState` hook
This hook allows subscription and full control over a state, and represents 
the API that you will be using with the most.

Its signature is:

```typescript
function useAsyncState(configuration, dependencies) {}
```

It returns an object that contains many properties, we'll explore them in a moment.

## Configuration and manipulation
The configuration argument may be a string, an object with supported properties,
or a producer function.

Let's see in details the supported configuration:

| Property              | Type                                              | Default Value                          | Description                                                                                                                                                                                        |
|-----------------------|---------------------------------------------------|----------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `key`                 | `string`                                          | `string`                               | The key of the async state we are defining, subscribing to or forking from                                                                                                                         |
| `lazy`                | `boolean`                                         | `true`                                 | If false, the subscription will re-run every dependency change                                                                                                                                     |
| `autoRunArgs`         | `any[]`                                           | `undefined`                            | If condition is truthy and lazy is false (automatic), these will the args received by the producer                                                                                                 |
| `lane`                | `string`                                          | `undefined`                            | If provided, the subscription will occur to a state Lane, and not the default state                                                                                                                |
| `fork`                | `boolean`                                         | `false`                                | If true, subscription will fork the state                                                                                                                                                          |
| `source`              | `object`                                          | `undefined`                            | A source object, similar to the one created by `createSource`                                                                                                                                      |
| `producer`            | `function`                                        | `undefined`                            | The producer function                                                                                                                                                                              |
| `selector`            | `function`                                        | `identity`                             | receives state (`{data, args, status}`, `lastSuccess`, `cache`) and returns the `state` property of the result value                                                                               |
| `areEqual`            | `function`                                        | `shallowEqual`                         | `(prevState, nextState) => areEqual(prevState, nextState)` determines whether the subscription should update or not                                                                                |
| `condition`           | `boolean or ((state: State<T, E, R>) => boolean)` | `true`                                 | If this condition is falsy, the automatic run isn't granted. this works only when `lazy = false`                                                                                                   |
| `forkConfig`          | `ForkConfig`                                      | `{keepState: false, keepCache: false}` | The fork configuration in case of `fork = true`                                                                                                                                                    |
| `cacheConfig`         | `CacheConfig`                                     | `undefined`                            | Defines the cache config for the producer                                                                                                                                                          |
| `runEffect`           | `RunEffect`                                       | `undefined`                            | Defines run effect to decorate the producer with: debounce, throttle, delay...                                                                                                                     |
| `runEffectDurationMs` | `number > 0`                                      | `undefined`                            | The duration of the effect in milliseconds                                                                                                                                                         |
| `resetStateOnDispose` | `boolean`                                         | `true`                                 | Whether to reset the state to its initial state when all subscribers unsubscribe or to keep it. Default to `false`.                                                                                |
| `skipPendingDelayMs`  | `number > 0`                                      | `undefined`                            | The duration under which a state update with a pending status may be skipped. The component in this case won't render with a pending status if it gets updated to something else under that delay. |
| `keepPendingForMs`    | `number > 0` or `undefined`                       | `undefined`                            | Once you step in a pending status, it will stay in pending state for this duration. This is supported to push the user experience to newer challenges                                              |
| `initialValue`        | `any`                                             | `null`                                 | The initial state value,  the initializer receives the cache as unique parameter                                                                                                                   |
| `events`              | `UseAsyncStateEvents`                             | `undefined`                            | Defines events that will be invoked with this subscription.                                                                                                                                        |

The returned object from `useAsyncState` contains the following properties:

| Property                                                    | Description                                                             |
|-------------------------------------------------------------|-------------------------------------------------------------------------|
| `key`                                                       | the key of the related state instance                                   |
| `read(suspend?: boolean = true, throwErr?: boolean = true)` | returns the selected value and suspends when pending or throws on error |
| `state`                                                     | The selected portion of the state                                       |
| `lastSuccess`                                               | the latest registered success state                                     |
| `version`                                                   | the version of the state, incremented at each update                    |
| `source`                                                    | a special object hiding the state instance and manipulates it           |
| `uniqueId`                                                  | the uniqueId of the state instance                                      |
| `getState`                                                  | gets the current state                                                  |
| `setState`                                                  | sets state and notifies all subscribers                                 |
| `run`                                                       | runs the producer and returns the abort function                        |
| `runp`                                                      | runs the producer and returns a promise to the run's resolve            |
| `runc`                                                      | runs the producer with onSuccess, onError and onAborted callbacks       |
| `replay`                                                    | replays the latest run if exists, or else does nothing                  |
| `abort`                                                     | aborts the current run or clears the abort callbacks if any             |
| `replaceProducer`                                           | replaces the producer linked to the state                               |
| `getLaneSource`                                             | gets the source of a child                                              |
| `removeLane`                                                | removes a lane                                                          |
| `invalidateCache`                                           | invalidates a cache entry or the whole cache                            |
| `replaceCache`                                              | replaces a cache entry                                                  |
| `mergePayload`                                              | merges a partial payload inside the state instance's payload            |
| `subscribe`                                                 | subscribes with a callback to state changes                             |
| `getConfig`                                                 | gets the current used config                                            |
| `patchConfig`                                               | patches the config related to the producer                              |
| `flags`                                                     | the subscription mode: listen, source, ...                              |
| `devFlags`                                                  | the subscription mode: listen, source, ...                              |

:::note 
Calling the `run`, `runp`, and `runc` functions when the status is `pending`
will result in aborting the previous run instantly, and start a new one.
:::

## Examples

Let's now make some examples using `useAsyncState`:

```javascript
import {useAsyncState} from "react-async-states";

// later and during render

// executes currentUserPromise on mount
const {state: {data, status}} = useAsyncState({key: "current-user", producer: currentUserPromise, lazy: false});

// subscribes to transactions list state
const {state: {data: transactions, status}} = useAsyncState("transactions");

// injects the users list state
const {state: {data, status}} = useAsyncState({key: "users-list", producer: usersListPromise, lazy: false, payload: {storeId}});

// forks the list of transactions for another store (for preview for example)
// this will create another async state issued from users-list -with a new key (forked)- without impacting its state
const {state: {data, status}} = useAsyncState({key: "users-list", payload: {anotherStoreId}, fork: true});

// reloads the user profile each time the match params change
// this assumes you have a variable in your path
// for example, once the user chooses a profile, just redirect to the new url => matchParams will change => refetch as non lazy
const matchParams = useParams();
const {state} = useAsuncState({
  ...userProfilePromiseConfig,
  lazy: false,
  payload: {matchParams}
}, [matchParams]);

// add element to existing state via replaceState
const {state: {data: myTodos}, replaceState} = useAsyncState("todos");
function addToDo(data) {
  replaceState(old => ({...old, [data.id]: data}));
}

// add element to existing state via run (may be a reducer)
// run in this case acts like a `dispatch`
const {state: {data: myTodos}, run} = useAsyncState("todos");

function addTodo(data) {
  run({type: ADD_TODO, payload: data});
}
function removeTodo(id) {
  run({type: REMOVE_TODO, payload: id});
}


```

## `useAsyncState` configuration
### `string` as the `key`
You may use a `string` as the first parameter to `useAsyncState`.

The key is detailed [here](#key).

### `Source` object
`useAsyncState` accepts a `Source` object as first parameter.

Read about it [here](#source).

### `Producer` function
`useAsyncState` accepts a `Producer` function as first parameter.

Read about it [here](#/docs/api/producer-function).

You can use it like this:

```typescript
// creates a new non shared state with myProducer as producer
useAsyncState(myProducer, [...deps]);

// creates a new non shared state from the given function
useAsyncState(function() {
  // do something
  // return state value or promise or thenable
}, [...deps]);

// creates a new non shared state from the given async/await function
useAsyncState(async function() {
  // do something
  await stuff;
  // return state value or promise or thenable
  
  // or even
  return await stuff;
}, [...deps]);

// creates a new non shared state from the given generator
useAsyncState(function* myProducer() {
  // do something
  yield stuff;
  // return state value or promise or thenable

  // or even
  return yield stuff;
  
  // or
  throw e;
}, [...deps]);
```


## `Configuration` object
### `key`
The key received by `useAsyncState` works as the following:
- If the `key` matches something
  - Take it and patch the producer and config if given
  - If `wait = true`, wait for a state with that key to be present
  - If `fork = true`, forks from the matched state.
- If there is no such a `key`, create it with given producer and config, if any

So as a recap, the key is needed:
- When defining a state
- When trying to subscribe to a state

:::note
The previous assumptions are related to `key` only. If a `Source` object is
provided, it would just perform `subscription` to it.
:::

The following snippets will give you a good idea of how to `useAsyncState`:

```typescript
import {useAsyncState} from "react-async-states";

// creates a state with `my-key` as key and undefined as producer
useAsyncState("my-key");

// will patch the state named my-key with myProducer
useAsyncState({
  key: "my-key",
  producer: myProducer,
});

```

```typescript
// listens or waits to the state with `my-key` as key
useAsyncState({
  key: "my-key",
  producer: myProducer,
  wait: true,
});

// the key property is completely ignored
useAsyncState({
  key: "my-key",
  source: mySource, // assuming this is a valid source object, or else it is like undefined
});

```

### `producer`
The production has its [own detailed documentation in this link](/docs/api/producer-function).

If the hook is used like this: `useAsyncState(producer)` it will create a new
non-shared state with the given producer and subscribes to it.

It can be used like this:
```typescript
import {useAsyncState} from "react-async-states";

useAsyncState({
  // the producer property can take any of the supported forms
  producer: async function (props) {...},
});
```

### `initialValue`
This property is relevant each time creating a new state, and serves as
the initializing value of the state (either a value or a function).

```typescript
import {useAsyncState} from "react-async-states";

useAsyncState({
  initialValue: 0,
  producer: counterProducer,
});
```

### `source`
The `Source` objects are retrieved either from [`createSource`](/docs/api/create-source)
or from the return value of `useAsyncState`.

It may be used like this:

```typescript
import {createSource, useAsyncState} from "react-async-states";

const mySource = createSource("my-key", myProducer, myConfig);

// later

// subscribes to the given state
useAsyncState(mySource);

// subscribes to the given state
// all other creation/listen properties are ignored, like key, producer
useAsyncState({source: mySource});

// forks the given state
// all other creation/listen properties are ignored, like key, producer
useAsyncState({source: mySource, fork: true});
```

### `condition`
This property is used only when `lazy` is `falsy`.
If the `condition` is truthy, the `producer` 
associated with the subscription will run.

It can also be a function that receives the actual state:

```typescript
{
  condition?: boolean | ((state: State<T, E, R>) => boolean)
}
```

This can be very helpful to avoid to setup cache for state instances
that only require to run once by the very first subscription.

This gives control over the auto run behavior depending on the state.

### `lazy`
If this property is set to `true`, when the dependencies change,
the `producer` will run if condition is `truthy`.

:::caution
If several subscriptions are made to the same state and all of them set `lazy`
to false, then they may `abort` each other if they have the same dependencies.

Pay close attention to this exact use case.
:::

### `autoRunArgs`
In case you are opting for a producer that works with `args` and at the same time
using `useAsyncState` with `lazy=false` and wish to pass arguments to your producer,
`autoRunArgs` allows this and takes the array of args to the automatic run's producer.

### `lane`
Lanes are a concept in the library that let's you group states with same producer:

A lane is a totally separate state instance, with own pending state,
and own payload and subscribers,  and with the same `config` and `producer` and `cache`.
It is very similar to forks, but forking means a separated state instance
not sharing anything and don't belong to anything.

A lane may have multiple subscribers and its own lifecycle.

You can manipulate lanes from all the places in the library.

```typescript
import {useAsyncState} from "react-async-states";

// subscribes to `city-casablanca` lane in the state defined in `weatherSource`
useAsyncState({
  source: weatherSource,
  payload: { lat, lng },
  lane: "city-casablanca"
});


// subscribes to `user-details-me` lane in the state defined in `userDetails`
useAsyncState({
  source: userDetails,
  payload: { userId: "me" },
  lane: "user-details-me"
});


// subscribes to `user-details-123` lane in the state defined in `userDetails`
useAsyncState({
  source: userDetails,
  payload: { userId: "123" },
  lane: "user-details-123"
});

// subscribes to `references-company-types` lane in the state defined in `references`
useAsyncState({
  source: references,
  payload: { userId: "123" },
  lane: "references-company-types"
});

```

### `fork`
If this property is true, it will fork the subscribed state with the given `forkConfig`.

### `forkConfig`

A configuration object containing the following:

| Property    | Type      | Default Value | Description                                                      |
|-------------|-----------|---------------|------------------------------------------------------------------|
| `key`       | `string`  | `undefined`   | The key that will be given to the created state (the forked one) |
| `keepState` | `boolean` | `undefined`   | Whether to keep the state from the original while forking        |
| `keepCache` | `boolean` | `undefined`   | Whether to keep the cache from the original while forking        |

```typescript
import {useAsyncState} from "react-async-states";

// forks from a Source object and copies its cache
useAsyncState({
  fork: true,
  source: mySource,
  forkConfig: {
    keepCache: true,
  }
})

// forks from the subscribed state (by key constraints)
useAsyncState({
  fork: true,
  key: "some-key",
  forkConfig: {
    key: "my-key",
  }
})
```


### `selector`
The selector that selects data from your state.
It is a function with the following in order parameters:

| Parameter     | Type       | Description                                                                       |
|---------------|------------|-----------------------------------------------------------------------------------|
| `state`       | `State<T>` | The current state                                                                 |
| `lastSuccess` | `State<T>` | The last registered state (may be equal to state if the current state is success) |
| `cache`       | `Cache<T>` | The cache associated to this state                                                |

```typescript
// extend the given state
import {State, Status, useAsyncState, UseAsyncState} from "react-async-states";

// syncSelector
// if you want that your state is always synchronous
// you may be interested only by the data inside the state
function syncSelector(state: State<T>): S {
  return state.data;
}

// this selector throws if the state is error so it is leveraged to the nearest
// error boundary
function errorBoundarySelector(state: State<T>): S {
  // assuming you have an error boundary
  if (state.status === Status.error) {
    throw state.data;
  }
  return state;
}

// this selector gives the last success data
function keepPreviousDataSelector(state: State<T>, lastSuccess): S {
  if (state.status === Status.pending) {
    return {
      ...state,
      data: lastSuccess.data,
    };
  }
  return state;
}

// select from cache selector
function errorBoundarySelector(state, lastSuccess, cache): S {
  // this requires the cache to be enabled
  if (cache['user-1-details']) {
    return cache['user-1-details']; // or cache['user-1-details'].data depending or your needs
  }
  return state;
}

function lazyDeveloperSelector(state: State<T>) {
  return {
    ...state,
    isError: state.status === Status.error,
    isPending: state.status === Status.pending,
    isWeird: false,
    ...
  }
}

const result: UseAsyncState<T, S> = useAsyncState({
  key,
  selector: mySelector,
})

```

### `areEqual`
`areEqual` function is used to determine whether the previous state value equals
the selected value from the new state.
This comparison occurs in a callback from React's `useState`. If they are equal
based on this function, the old value is used (so react won't trigger an update).
If they are different, the new value is used and react will perform a rerender.

### `runEffect`
Defines the effect to apply on the producer while running.

This property is only relevant when creating a new state.

There are two types of run effects:
- `debouce`: or `delay`, `takeLast` or `takeLatest` and means take the last
  registered run in the configured duration.
- `throttle`: or `takeFirst` or `takeLeading` and means take the first ever run
  in the duration.

### `runEffectDurationMs`
`runEffectDurationMs` : the duration of the effect.

Here is a working example of debouncing the `getClientProducer` while typing:

```typescript
const { run, state } = useAsyncState({
  producer: getClientProducer,

  runEffect: "debounce",
  runEffectDurationMs: 500,
});

// later:
<input placeholder="User id 1-10" onChange={(e) => run(e.target.value)} />

```

### `skipPendingDelayMs`
`skipPendingDelayMs` : The duration under which a state update with a pending 
status may be skipped. The component in this case won't render with a pending 
status if it gets updated to something else under that delay.

Here is a working example of debouncing the `getClientProducer` while typing:

```typescript
// the state won't go to pending if the fetch goes under 300ms!
const { run, state } = useAsyncState({
  skipPendingDelayMs: 300,
  producer: getClientProducer,
});

```

### `keepPendingForMs`
`keepPendingForMs` : The duration to keep the pending state in to avoid the UI
flashing if the resolve occurs right after passing the pending by few millis.

```typescript
// the pending state will totally be skipped it resolves less than 200ms
// the state will stay in pending state in at least 500ms
const { run, state } = useAsyncState({
  keepPendingForMs: 500,
  skipPendingDelayMs: 200,
  producer: getClientProducer,
});

```

### `resetStateOnDispose`
`resetStateOnDispose` : Defines whether to reset the state to the initial value
when all subscribers unsubcribe, or to keep the current value.

The default value is `false` and the library will not reset the state to its 
initial value by default by convenience.

```typescript
const { run, state } = useAsyncState({
  resetStateOnDispose: true,
  producer: getClientProducer,
});


// or

createSource(key, producer, {resetStateOnDispose: true});
```

### `cacheConfig`
It determines the cache configurations:

| Property      | Type                                                              | Description                                                                      |
|---------------|-------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `enabled`     | `boolean`                                                         | Whether to enable cache or not                                                   |
| `hash`        | `(args?: any[], payload?: {[id: string]: any} or null) => string` | a function to calculate a hash for a producer run (from args and payload)        |
| `getDeadline` | `(currentState: State<T>) => number`                              | returns the deadline after which the cache is invalid                            |
| `load`        | `() => {[id: string]: CachedState<T>}`                     | loads the cached data when the async state instance is created                   |
| `persist`     | `(cache: {[id: string]: CachedState<T>}) => void`          | a function to persist the whole cache, called when state is updated to success   |
| `onCacheLoad` | `onCacheLoad?({cache, setState}): void`                           | a callback called when the cache loads, useful when asynchronously loading cache |

### `events`
The `events` property defines handlers that will be invoked.

```ts
export type UseAsyncStateEvents<T> = {
  change?: UseAsyncStateEventFn<T> | UseAsyncStateEventFn<T>[],
  subscribe?: ((props: SubscribeEventProps<T>) => CleanupFn) | ((props: SubscribeEventProps<T>) => CleanupFn)[],
}
```

The supported events are:
- `subscribe`: invoked when a subscription to a state occurs.
- `change`: invoked whenever the state value changes. Always invoked, even if
`areEqual` is truthy.

#### `subscribe`
This event handler is called once a subscription to a state occurs.

```typescript

```

This should be mainly used to attach event listeners that may `run` the producer
or do another side effect.

```javascript
// this is how the library invokes the subscribe events.
unsubscribe = subscribe(sourceObject);
```

This functions returns its cleanup (if available.)

Here is an example of how to use it to run your producer once your window gets focused:

```typescript
const {state: {status, data}, lastSuccess, abort} = useAsyncState({
    lazy: false,
    payload: {matchParams: params},
    key: demoAsyncStates.getUser.key,
    events: {
      subscribe: ({getState, run, invalidateCache}) => {
        const state = getState();
        function onFocus() {
          if (shouldInvalidateCacheAndRun()) {
            invalidateCache();
            run();
          }
        }
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
      },
    }
  }, [params]);
```

#### `change`
This event handler is called when the state changes.

Please note that these handlers are invoked after subscription to a state,
so they will miss any state update when "`not subscribed`". Although, this
may change in the future and also the events function could be granted the producer
power.

This should be mainly used to run side effects after a `status` change.

Here are some examples of how to use it:

```typescript
const {state: {status, data}, lastSuccess, abort} = useAsyncState({
    lazy: false,
    payload: {matchParams: params},
    key: demoAsyncStates.updateUser.key,
    events: {
      change: ({state, source}: {state: State, source: Source}) => {
        if (state.status === "success") {
          refreshList();
          closeModal();
        }
      },
    }
  }, [params]);
```

## `useAsyncState` dependencies
`useAsyncState` accepts a second parameter that corresponds to the array of its
dependencies.
The default value is empty array rather that undefined.

The dependencies are the secure vault over closure variables that you make, so
always be sure to add them responsibly.

```typescript
import {useAsyncState} from "react-async-states";

const params = useParams;
useAsyncState(function getUserDetails(props) {
  doSomethingWith(params)
  return stateValue;
}, [
  params,// whenever params change, recreate the state
]);

// OR USING PAYLOAD
function callback() {}
useAsyncState({
  payload: {params, callback},
  producer(props) {
    const {params} = props.payload;
    callback();
  },
}, [
  params,
  callback,
]);
```

:::warning
Be sure to add relevant component variables used in the subscription as
dependencies or you will have unwanted behavior and hard to debug/spot bugs.
:::

## `useAsyncState` return value
### `key`

Corresponds to the key of the `AsyncState` instance that you subscribed to.

For example, if you choose to fork a state while omitting the fork key, an
automatic key will be given. You'll need that `key` or the `source` to be able
to subscribe to it.

```typescript
import {useAsyncState} from "react-async-states";

const {key} = useAsyncState();
```
### `source`
This is the same object given by [`createSource`](/docs/api/create-source)
and it shall allow further subscription to the state.

Why does source and key both exist:

The library doesn't use any global store to keep a reference towards created
states, so they will be garbage collected immediately after loosing developer
reference towards them. THe source object contains the instance of state,
by providing it back to the library, it knows how unwrap it and perform
subscription and/or run it.

Plus, `createSource` doesn't need react to work, so it will allow creating
module level states. Also, the library support running producers and states
from almost everywhere in your code base, and it would just work if you provid
a `Source` object.

The source object has the following properties:

| Property          | Type                                                | Description                                                                |
|-------------------|-----------------------------------------------------|----------------------------------------------------------------------------|
| `key`             | `string`                                            | the provided key of the state instance                                     |
| `run`             | `function(...args[])`                               | A function that runs the producer attached to the source                   |
| `getState`        | `() => State<T>`                                    | returns the current state of the source object                             |
| `getLaneSource`   | `(lane?: string) => Source<T>`                      | returns a `source` object for the given lane                               |
| `setState`        | `((t: T) => void) or (prev: State<T>, status) => T` | replaces the current state with the value or the provided updater function |
| `invalidateCache` | `(cacheKey?: string) => void`                       | invalidates the given cache by key or the whole cache                      |


```typescript
import {useAsyncState} from "react-async-states";

const {source} = useAsyncState();
```
### `uniqueId`
This is only used in development mode and was originally added with the devtools.

In general, you would never use this (unless you are a contributor and debugging things).

### `state`
This is whatever the selector returns:

The selector is described in [its own section](#selector).

The default selector of the library returns the `State` identity, which is
composed of:


| Property    | Type                                    | Description                                                      |
|-------------|-----------------------------------------|------------------------------------------------------------------|
| `data`      | `T`                                     | The returned data from the `producer function`                   |
| `status`    | `initial,pending,success,error,aborted` | The status of the state                                          |
| `props`     | `ProducerProps`                         | The argument object that the producer was ran with (the `props`) |
| `timestamp` | `number`                                | the time (`Date.now()`) where the state was constructed          |


```typescript
import {State, UseAsyncState, useAsyncState} from "react-async-states";

type User
{
  name: string,
}

function myProducer(): Promise<User> {
  return fetch(url).then(r => r.json());
}

function userNameSelector(state: State<User>): string | null {
  return state.status === "success" ? state.data.name : null;
}

// later:
const {state}: UseAsyncState<User> = useAsyncState(myProducer);


// state in this case is a string
const {state: userName}: UseAsyncState<User, string> = useAsyncState({
  producer: myProducer,
  selector: mySelector,
})


function defaultLibrarySelector(...args): State<T> {
  return args[0];
}

```
### `read`


```typescript
read(suspend?: boolean = true, throwError?: boolean = true);
```
This function enable the react's concurrent feature: `Component suspension` and
`Error boundary`.

So calling read requires you to have a `Suspense` and/or `ErrorBoundary`
up in your tree.

You can pass this function to a child component that will read the data and
suspend if pending.

```tsx
import {Suspense} from "react";
import {useAsyncState} from "react-async-states";


function UserDetails({userId}) {
  
  const {read, state} = useAsyncState({
    lazy: false,
    payload: {userId},
    source: userDetailsPageSource,
  }, [userId]);
  
  
  return (
    <Suspense fallback={<Skeleton userId={userId} />}>
      <ErrorBoundary>
        <UserDetails read={read} />
      </ErrorBoundary>
    </Suspense>
  );
}

function UserDetails({read}) {
  // when pending, this line will throw a Promise that react will catch
  // and display Suspense's fallback until present
  const {data, status} = read();
  
  return (
    // build the UI based on the statuses you need
  );
}

```

### `run`
This function triggers the producer run.

It gives to the producer whatever it was called with as `args`.

```typescript

// calling run like this
run(1, 2, 3);
// should be reflected like this for the producer when running:
props = {
  // ...
  args: [1, 2, 3]
  // ...
}
        
// calling run like this
run(1, 2, 3);
// should be reflected like this for the producer when running:
props = {
  // ...
  args: [1, 2, 3]
  // ...
}

// calling run like this
run();
// should be reflected like this for the producer when running:
props = {
  // ...
  args: []
  // ...
}

// calling run like this
run("increment", 1);
// should be reflected like this for the producer when running:
props = {
  // ...
  args: ["increment", 1]
  // ...
}

// calling run like this
run(1, {name: "John"});
// should be reflected like this for the producer when running:
props = {
  // ...
  args: [1, {name: "John"}]
  // ...
}

```

### `abort`
the `abort` function when called, if the status is pending, it would trigger
the abort, and execute all registered abort callbacks.

```tsx
import {useAsyncState} from "react-async-states";

const {state: {status}, abort} = useAsyncState("my-key");

{status === "pending" && <Button onClick={() => abort("user_action")}>Abort</Button>}
```

### `invalidateCache`
```typescript
invalidateCache: (cacheKey?: string) => void
```
Takes an optional `cacheKey` parameter that:
- If provided, will delete the cache entry from cache.
- If not provided, will delete the whole cache.

```tsx
import {useAsyncState} from "react-async-states";

const {invalidateCache} =  useAsyncState({
  source: usersPageSource,
});

<Button onClick={() => {
  invalidateCache();
  run()
}}>Reset search</Button>
```

### `mergePayload`
The payload that the producer returns is the payload issued from all subscribers,
and the one that this function adds:

```typescript
import {useAsyncState} from "react-async-states/src";

const {mergePayload} = useAsyncState();

mergePayload({userId: 1, isNew: false});

// payload is {userId: 1, isNew: false}

mergePayload({count: 3, userId: 5});

// payload is {count: 3, userId: 5, isNew: fale}
```

### `replaceState`
replaceState is of type : `StateUpdater`:

```typescript
type StateUpdater<T> = (
  updater: T | StateFunctionUpdater<T>,
  status?: Status
) => void;
```

It just puts a value as the current state.

We don't believe you will use it.

### `lastSuccess`
This points to the last state with status `success`.

So if state is actually with a success state, they are the same object.

You can use it if you want to be sure in a component that you interact with
a state of type success all the time:

```tsx
import {useAsyncState} from "react-async-states";

const {state: {status, props, data}, lastSuccess} = useAsyncState(myConfig);

// You can think of the following UI, that
// always display the data in the background
// when pending or error it just displays an error on top of it
<MyContainer >
  <MyData data={lastSuccess} />
  <ErrorOverlay data={data} visible={status === "error"} />
  <PendingOverlay data={props} visible={status === "pending"} />
< /MyContainer>
```

## Other hooks
For convenience, we've added many other hooks with `useAsyncState` to help inline most of the situations: They inject
a configuration property which may facilitate using the library:

The following are all hooks with the same signature as `useAsyncState`, but each predefines something in the configuration:
- `useAsyncState.auto`: adds `lazy: false` to configuration
- `useAsyncState.lazy`: adds `lazy: true` to configuration
- `useAsyncState.fork`: adds `fork: true` to configuration
- `useAsyncState.forkAudo`: adds `lazy: false, fork: true` to configuration

The following snippets results from the previous hooks:

```javascript
// automatically fetches the user's list when the search url changes
const {state: {status, data}, run, abort} = useAsyncState.auto(DOMAIN_USER_PRODUCERS.list.key, [search]);
// automatically fetches user 1 and selects data
const {state: user1} = useAsyncState.auto({source: user1Source, selector: s => s.data});
// automatically fetches user 2 and selects its name
const {state: user2} = useAsyncState.auto({source: user2Source, selector: name});
// forks userPayloadSource and runs it automatically with a new payload and selects the name from result
const {state: user4} = useAsyncState.forkAuto({source: userPayloadSource, payload: {userId: 4}, selector: name})
```

:::tip
To suspend a component in concurrent mode, or throw to error boundary on error,
just call the `read` function returned by `useAsyncState` or any other hook.
:::

