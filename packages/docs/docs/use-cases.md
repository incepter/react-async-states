---
sidebar_position: -2
sidebar_label: Use cases
---
# React async states use cases

The library can be used for the following use cases/paradigms:

## **Manage data fetching**
The primary usage of asynchronous programing is to fetch data.
Data fetching can be as easy as writing the request function, the library then 
adds the `status` as part of the state along with resulting `data` and the 
parameter that the function was ran with (`props`) and the `timestamp` at which
the state was constructed.

Click on [this link](/docs/faq/how-the-library-works) for more on data fetching.

Example:
```javascript
// very basic usage can be like this:
const {state: {status, data, props}} = useAsyncState(() => fetch().then());
const {state: {status, data, props}} = useAsyncState(async () => await fetch().then());
const {state: {status, data, props}} = useAsyncState(function* () {return yield fetch().then()});
const {state: {status, data, props}} = useAsyncState(myProducer);
```

## **Register abort callbacks**
The library allows to easily register abort callbacks from the `PRODUCER` function.
This is used to abort fetch operations and perform cleanups.
Example:
```javascript
const {state: {status, data}} = useAsyncState(function getUserPosts(props) {
  const controller = new AbortController();
  // NOTE: many abort callbacks can be registered, even conditionally
  // props.onAbort(() => clearTimeout(timeoutId));
  props.onAbort(() => controller.abort());
  const {signal} = controller;
  return fetch(someUrl, {signal}).then(readFetchResponse);
});
```

Click on [this link](/docs/faq/cancellations) for more on data fetching.

## **Automatic abort**
Aborting a function call can be either automatic or imperative by user action
(via the `abort` API). The call will be automatically aborted if the 
dependencies change or the component unmounts. If the function is a generator,
it will immediately stop invocation on the next yield.

The abort callback is retrieved from `useAsyncState` like this:
```javascript
const {abort} = useAsyncState(asyncFunction);
```

## **Mix synchronous and asynchronous behavior**
The library transition to `pending` state only if it encounters
a `Promise` object. This means that synchronous states will pass directly 
to `success` or `error` states without a `pending` transition.

So all depends on the return value of the `Producer`, if it returns a `Promise`
or  a `thenable` it passes to `pending`. 

## **Derive states and control when to re-render**
You can select only portions of a state (or multiple states) and
decide whether they are the same or not (to trigger a re-render).
Example:
```javascript
// state here is no longer the default, but what `selector` returns
const {state: username} = useAsyncState({
  // ...
  selector: current => current.status === "success" && current.data.name,
  areEqual: (prev, next) => prev === next, // the default equality check is by Object.is
})
// or can be used like this:
const currentUserPosts = useSelector(
  ["current-user", "posts"],
  (user, posts) => posts.data.filter(t => t.data.userId === user.id),
  areEqual
);
```
## **Select from multiple states**
This is possible via `useSelector` that allows to subscribe to multiple
states and select the needed information. It also allows you to write a function
receiving all registered states in the provider and subscribe to only relevant 
ones based on your needs (maybe targeting via regex?).

## **Work with or without AsyncStateProvider**
Sharing state can be done via provider, and then you only need the `string` key
to subscribe to it, and you can even wait for it to be available.
This isn't the only way to subscribe to a state, it can be done via other
techniques that we will see later.

## **Dynamic creation and sharing of states**
States can be dynamically created and shared at runtime with different ways:
   1. You can change the initial registered states at the provider, anytime.
   2. You can '`hoist`' on demand created state to the provider.
   3. You can declare them at component or module level and wire them.
   3. you can create them anytime via `createSource`
   
Example:
```javascript
// inside a component:
const {source} = useAsyncState();
// later, in another component:
const {state, run} = useAsyncState(source);

// or at module level
import {createSource} from "react-async-states";

const source = createSource(key, producer, config);
// then, in any part of the app, subscribe and have full control over it
const {state, run} = useAsyncState(source);
```
## **Fork and replicate behavior**
This allows to re-use your function in a completely new state (with all features)
without impacting the original state.
This process is called `forking` and technically re-uses the `config` and
`producer` you used.

## **Debounce and throttle**
You can debounce and throttle function calls. Example:

```javascript
// at module level
const source = createSource(key, producer, {runEffect: "debounce", runEffectDurationMs: 500});
// or
const {state} = useAsyncState({runEffect: "debounce", runEffectDurationMs: 500});
```

## **React 18+ friendly**
The library already supports React 18 paradigms, and allows to suspend a component when
the state status is `pending` via the `read()` function:
```javascript
const {read} = useAsyncState(asyncFunction);

// this either suspends on react 18+ or give you the selected state after warning you
const selectedState = read();
```

## **Powerful producers**
The producer concept is  a more generic way to grab
state from a function, the library tries to give the producers more power to have
more control in your app. Like
- Running a producer from a producer
- Cascade cancellation
- Create a producer inside a producer (close over params)
- Select from other async states
- Run and wait
- Run while forking...
- Update state after resolve (optimization for SSE and websockets and intervals and workers)

## **Cache support**
The library supports caching the producer's result from the `args` and
`payload` that was ran with.
The cache may be invalidated via `invalidateCache`, persisted via `persist` and
loaded via `load`.

## **Post subscription callback**
When a subscription occurs to an async state, a `postSubscribe` may be useful
to attach some platform specific event handlers like focus, resize... etc

