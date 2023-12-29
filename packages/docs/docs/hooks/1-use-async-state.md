---
sidebar_position: 1
sidebar_label: useAsync
---
# `useAsync`

## The `useAsync` hook
This hook allows subscription and full control over a state, and represents 
the API that you will be using with the most.

Its signature is:

```typescript
function useAsync<TData, TArgs, TError, TSelection = State<TData, TArgs, TError>>(
  config: MixedConfig<TData, TArgs, TError, TSelection>,
  deps: any[] = []
): UseAsyncResult<TData, TArgs, TError> {
  // [Not Native Code]
}

// or without types:
function useAsync(config, deps) {
  // [Not Native Code]
}

// used like this:

const result = useAsync(config, deps);
```

It returns an object that contains many properties, we'll explore them in a
moment.

## The `useAsyncState` hook
Previously, the `useAsync` hook was called `useAsyncState`. It was renamed
because it is shorter and they mean the same thing for the library.

Both hooks still exist for backward compatibility and they refer to the same
thing.


:::note
It is important to add all relevant dependencies the same way you add deps
to any React hook such as `useEffect` or `useMemo`.
:::

## `string` config
You can use `useAsync` by providing the state name directly.

This won't grant you any typescript benefits because you are not passing
an `initialValue` or a `producer`. But you still can annotate it.

```tsx
const result = useAsync<number>("counter");
const result = useAsync<Todos[]>("todos-list");
```

## `Source` object
The `Source` objects are special objects understood by the library, and thus you
can pass it to all hooks.

Creating source was detailed in [their section.](/docs/api/create-source)

```tsx
const result = useAsync(currentUser);
const result = useAsync(counterSource);
const result = useAsync(usersListSource);
const result = useAsync(userDetailsSource);
```
## `Producer` config
`useAsync` accepts also the `Producer` function directly.

Read about it [here](/docs/api/producer-function).

You can use it like this:

```typescript
const result = useAsync(myProducer);
const result = useAsync(function() {
  // do something
  // return state value or promise or thenable
}, [...all closure variables used inside the function]);
const result = useAsync(async function({ args }) {
  await stuff;
  return await another_stuff;
});
const result = useAsync(function* myProducer() {
  // do something
  yield stuff;
  // return state value or promise or thenable
  // or even
  return yield stuff;
  // or even
  throw e;
}, [...deps]);
```


## `object` config

The `useAsync` accepts a configuration object with many properties:

### The whole producer config
`useAsync` accepts all the properties used with `createSource`, we won't
talk about them again here to keep this section small.

Read about them [in their section.](/docs/api/create-source#configuration)

But here is the list:

- `initialValue`
- `runEffect`
- `runEffectDurationMs`
- `skipPendingDelayMs`
- `keepPendingForMs`
- `skipPendingStatus`
- `cacheConfig`
- `retryConfig`
- `resetStateOnDispose`
- `context`
- `storeInContext`
- `hideFromDevtools`

In addition, the following properties are supported, and are all optional:

### `key`
```tsx
key: string;
```
This is the same as providing a string configuration. It will be used to grab
the state to use.

If not defined, it is created using this key.

### `producer`
```tsx
producer: Producer;
```
This is the same as providing a producer configuration. It will be used to
create a state instance with this producer.

If the state instance already exists, its producer will be replaced by this one.
### `source`
```tsx
source: Source;
```
This is the same as providing a `source` configuration. The used state is then
the provided source.

### `lazy`
```tsx
lazy: boolean;
```
If this property is set to `true`, when the dependencies change,
the `producer` will run if condition is `truthy`.

:::caution
If several subscriptions are made to the same state and all of them set `lazy`
to `false`, then they may `abort` each other.
But the latest run will remain.

Pay close attention to this exact use case.
:::

### `autoRunArgs`
```tsx
autoRunArgs: TArgs;
```
When `lazy` is `false` and condition is either omitted or try thy, these args
will be used to run.

### `condition`
```tsx
condition:
  | boolean
  | ((
    state: State<T, A, E>,
    args: A,
    payload: Record<string, unknown>
  ) => boolean);
```
  
This property is used only when `lazy` is `falsy`.
If the `condition` is truthy, the `producer` 
associated with the subscription will run.

It can also be a function that receives the actual state, args and payload.

This gives control over the auto run behavior depending on the state.

### `lane`
Lanes are a concept in the library that let's you group states with same producer:

A lane is a totally separate state instance, with own pending state,
and own payload and subscribers,  and with the same `config` and `producer` and `cache`.
It is very similar to forks, but forking means a separated state instance
not sharing anything and don't belong to anything.

A lane may have multiple subscribers and its own lifecycle.

You can manipulate lanes from all the places in the library.

```typescript
import {useAsync} from "react-async-states";

// subscribes to `city-casablanca` lane in the state defined in `weatherSource`
useAsync({
  source: weatherSource,
  payload: { lat, lng },
  lane: "city-casablanca"
});

// subscribes to `user-details-me` lane in the state defined in `userDetails`
useAsync({
  source: userDetails,
  payload: { userId: "me" },
  lane: "user-details-me"
});

// subscribes to `user-details-123` lane in the state defined in `userDetails`
useAsync({
  source: userDetails,
  payload: { userId: "123" },
  lane: "user-details-123"
});

// subscribes to `references-company-types` lane in the state defined in `references`
useAsync({
  source: references,
  payload: { userId: "123" },
  lane: "references-company-types"
});
```

:::note
The previous example is flawed in the sense that most things need to be added to
the dependencies array. The example contains static values, but in real world,
they will often be some props.
:::

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
import {State, Status, useAsync} from "react-async-states";

// this selector throws if the state is error so it is leveraged to the nearest
// error boundary
function errorBoundarySelector(state: State<T>): S {
  // assuming you have an error boundary
  if (state.status === "error") {
    throw state.data;
  }
  return state;
}

function lazyDeveloperSelector(state: State<T>) {
  return {
    ...state,
    isError: state.status === "error",
    isPending: state.status === "pending",
    isWeird: false,
    ...
  }
}

const result = useAsync({
  key,
  selector: mySelector,
})
```

:::note
The `selector` affects only the `state` property of the returned result.
:::

### `areEqual`
`areEqual` function is used to determine whether the previous state value equals
the selected value from the new state.

### `concurrent`
Will cause the tree to suspend according to React concurrent features if the
status is `pending`.

### `events`
The `events` property defines handlers that will be invoked.

```ts
export type useAsyncEvents<T> = {
  change?: useAsyncEventFn<T> | useAsyncEventFn<T>[],
  subscribe?: ((props: SubscribeEventProps<T>) => CleanupFn) | ((props: SubscribeEventProps<T>) => CleanupFn)[],
}
```

The supported events are:
- `subscribe`: invoked when a subscription to a state occurs.
- `change`: invoked whenever the state value changes. Always invoked, even if
  `areEqual` is truthy.

#### `subscribe`
This event handler is called once a subscription to a state occurs.

This should be mainly used to attach event listeners that may `run` the producer
or do another side effect.

```javascript
// this is how the library invokes the subscribe events.
const unsubscribe = subscribe(sourceObject);
```

This functions returns its cleanup (if available.)

Here is an example of how to use it to run your producer once your window gets
focused:

```typescript
const result = useAsync({
  lazy: false,
  autoRunArgs: [params],
  key: "get-user-details",
  events: {
    subscribe: ({getState, source: {run, invalidateCache}}) => {
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
so they will miss any state update when "`not subscribed`".

This should be mainly used to run side effects after `state` changes.

Here are some examples of how to use it:

```typescript
const {state: {status, data}, lastSuccess, abort} = useAsync({
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

## `useAsync` dependencies
`useAsync` accepts a second parameter that corresponds to the array of its
dependencies.
The default value is empty array rather that undefined.

When dependencies change, the following is done:
- Lookup the state instance
- Invoke subscribe events if applied
- Auto run if applied

The dependencies are the secure vault over closure variables that you make, so
always be sure to add them responsibly.

```typescript
import { useAsync } from "react-async-states";

// this will change the producer everytime the params change, for example
const params = useParams;
useAsync(function getUserDetails(props) {
  doSomethingWith(params)
  return stateValue;
}, [params]);

// Or when using payload or args
function callback() {}
useAsync({
  payload: {params},
  autoRunArgs: [callback],
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

:::tip
The library was designed so that you will likely only need dependencies
when the source/key configuration or`autoRunArgs` are variables.
:::

## `useAsync` result

### `source`
The source related to the state used by `useAsync` is always returned.

Read more about its properties in [its section.](/docs/api/create-source#the-source)

### `state`
This is whatever the selector returns:

If the selector is omitted, the whole `state: State<TData, TArgs, TError>` is
returned.

### `Initial`
A boolean that's true if the current state is with `initial` status.
### `isPending`
A boolean that's true if the current state is with `pending` status.
### `isSuccess`
A boolean that's true if the current state is with `success` status.
### `isError`
A boolean that's true if the current state is with `error` status.


### `data`
```tsx
data: TData | null;
```
This property is always of type `TData` if the status is `success`. It may be
null if `status` is:
- `initial` and no `initialValue` was provided.
- `pending` and success was registered before.
- `error` and success was registered before.

### `error`
```tsx
error: TError | null;
```

This property is of type `TError` when `isError` is true. It then contains the
error.

### `read`

```typescript
read(suspend?: boolean = true, throwError?: boolean = true);
```
This function enable the React concurrent feature: `Component suspension` and
`Error boundary`.

So calling read requires you to have a `Suspense` and/or `ErrorBoundary`
up in your tree.

You can pass this function to a child component that will read the data and
suspend if pending.

```tsx
import { Suspense } from "react";
import { useAsync } from "react-async-states";


function UserDetails({userId}) {
  const { read } = useAsync({
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
  // status will be success here
  const {data} = read();
  
  return (
    // build the UI based on the statuses you need
  );
}

```

### `onChange`
This injects `change` `events`, and can be called during render or
imperatively anywhere. These events live just with the current subscription.

### `onSubscribe`
This injects subscribe `events`, and can be called during render or
imperatively anywhere. These events live just with the current subscription.

## Other hooks
For convenience, we've added the `useAsync.auto` to help you add the
`lazy: false` configuration property automatically.

It has the same signature as `ueAsync`.
