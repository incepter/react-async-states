---
sidebar_position: 1
sidebar_label: Intro
---
# React async states
> A multi-paradigm React state management library.

## What is this ?
This is a multi-paradigm library for decentralized state management in React.
It aims to facilitate and automate working with [a]synchronous states while sharing them. It was designed to help us reduce the 
needed boilerplate (code/files) to achieve great and effective results.

## Main features
The features that make this library special are:
- Easy to use and Minimal API (`useAsyncState`).
- Tiny library with 0 dependencies, only react as a peer dependency, and should target all react environments.
- Run [side] effects, abort them and/or replace state anytime.
- Run [side] effects either declaratively via dependencies or imperatively.
- Contains state `status` by default (initial, pending, success, error and aborted).
- Supports many forms on functions (async/await, promises, generators, reducers...).
- Debounce and throttle calls.
- Bidirectional abort binding that lets you register an `abort callback` to easily abort fetch requests or perform cleanups.
- Dynamic creation and sharing of states at runtime.
- Share states inside and outside the context provider.
- Subscribe and react to selected portions of state while controlling when to re-render.
- Fork an asynchronous state to re-use its function without impacting the original state value.
- Hoist states to provider on demand (aka: injection).
- Automatic cleanup/reset on dependencies change (includes unmount).
- React 18+ friendly (already supported through the `read()` API)
- Powerful selectors.

## Use cases
This said, the library can be used for the following use cases/paradigms:
1. **Manage data fetching**: Data fetching can be as easy as writing the request function, the library then adds
the `status` as part of the state along with resulting `data` and the parameter that the function was ran with (`props`).
Example:
```javascript
// very basic usage can be like this:
const {state: {status, data, props}} = useAsyncState(() => fetch().then());
const {state: {status, data, props}} = useAsyncState(async () => await fetch().then());
const {state: {status, data, props}} = useAsyncState(function* () {return yield fetch().then()});
const {state: {status, data, props}} = useAsyncState(myProducer);
```
2. **Register abort callbacks**: The library allows to easily register abort callbacks from your `PRODUCER` function.
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
3. **Automatic abort on dependencies change/unmount**: Aborting a function call can be either automatic or imperative
by user action (via the `abort` API). The call will be automatically aborted if the dependencies change or the component
unmounts. If the function is a generator, it will immediately stop invocation before the next yield.

The abort callback is retrieved from `useAsyncState` like this:
```javascript
const {abort} = useAsyncState(asyncFunction);
```
4. **Mix synchronous and asynchronous behavior**: The library only transition to `pending` state if it encounters
a `Promise` object. This means that synchronous states will pass directly to `success` or `error` states without a `pending` transition.
5. **Derive states and control when to re-render**: You can select only portions of a state (or multiple states) and
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
const currentUserPosts = useAsyncStateSelector(
  ["current-user", "posts"],
  (user, posts) => posts.data.filter(t => t.data.userId === user.id),
  areEqual
);
```
6. **Select from multiple states**: This is possible via `useAsyncStateSelector` that allows to subscribe to multiple
states and select the needed information. It also allows you to write a function receiving all registered states in
the provider and subscribe to only relevant ones based on your needs (may be targeting via regex?).
7. **Work with or without AsyncStateProvider**: Sharing state can be done via provider, and then you only need the
String key to subscribe to it, and you can even wait for it to be available. But this isn't the only way to subscribe
to a state, but can be done via other techniques that we will see later.
8. **Dynamic creation and sharing of states at runtime**: States can be dynamically created and shared at runtime with
different ways:
   1. You can change the initial registered states at the provider, anytime.
   2. You can '`hoist`' on demand created state to the provider.
   3. You can declare them at component or module level and wire them.
   
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
9. **Fork and replicate behavior without impacting the original state**: This allows to re-use your function in a completely
new state (with all features) without impacting it.
10. **Debounce and throttle**: You can debounce and throttle function calls. Example:

```javascript
// at module level
const source = createSource(key, producer, {runEffect: "debounce", runEffectDurationMs: 500});
// or
const {state} = useAsyncState({runEffect: "debounce", runEffectDurationMs: 500});
```
11. **React 18+ friendly**: The library already supports React 18 paradigms, and allows to suspend a component when
the state status is `pending` via the `read()` function:
```javascript
const {read} = useAsyncState(asyncFunction);

// this either suspends on react 18+ or give you the selected state after warning you
const selectedState = read();
```
12. **Powerful producers**: The producer concept is  a more generic way to grab
state from a function, the library tries to give the producers more power to have
more control in your app. Like
- Running a producer from a producer
- Cascade cancellation
- Create a producer inside a producer (close over params)
- Select from other async states
- Run and wait
- Run while forking...
- Update state after resolve (optimization for SSE and websockets and intervals and workers)

13. **Cache support**: The library supports caching the producer's result
from the `args` and `payload` that was ran with.
The cache may be invalidated via `invalidateCache`, persisted via `persist` and
loaded via `load`.

14. **Post subscription callback**: When a subscription occurs to an async state,
a `postSubscribe` may be useful to attach some platform specific event handlers
like focus, resize... etc

## Motivations
Managing state using React native APIs or third party libraries ain't an easy task. Let's talk about the parts we miss:

- Combining synchronous and asynchronous effects.
- Automatically reset a state when you no longer use it.
- Dealing with concurrent asynchronous operations' callbacks.
- Dynamically share states, subscribe and have full control over them.
- Select a part of a state and re-render only when you decide that it changed.
- Share state in all directions of a react app, inside and outside context providers.
- The need to add additional state values each time to represent loading and error states.
- Automatically cancel asynchronous operations when the component unmounts, or dependencies change.
- Cannot automatically declare and share a state from a component and subscribe to it from other parts of the app.

Without these aspects, your application will surely be in a mess, when you get to see search results of the very early
search operation, when you have to do over-engineered stuff to support a simple thing such as cancelling a fetch request
and a lot of other messy stuff.

## Concepts and definitions

The library gives you the state value and full control over it, the state of the library is composed of three properties: 
`status`, `data` and `props`, where the `data` is returned (or `thrown`) from your function: called the `the producer function`. 

### What is a producer function ?
The producer function is a javascript function, and it is responsible for returning the state's `data`.

It may be:
- A regular function returning a `Promise` object.
- A regular function returning a value (reducers, async reducers, mixed...).
- An asynchronous function with `async/await` syntax.
- A `generator` (sagas...).
- `undefined` to replace the state synchronously any time with the desired value.

### What is the library's state shape:
The library's state value is composed of three properties:

|Property|Type                                   |Description              |
|--------|---------------------------------------|-------------------------|
|`data`  |`T`                                    | The returned data from the `producer function` |
|`status`|`initial,pending,success,error,aborted`| The status of the state |
|`props`  |`ProducerProps`                       | The argument object that the producer was ran with (the `props`) |

### What are the possible state transitions:
The following image shows the possible state transitions:

![img](/img/state-transitions.png)

:::note
1- The library supports synchronous states as well.

If the producer function returns a value besides a `Promise` or a `Generator`, it is considered synchronous
and pass directly to `success` or `error` state.

2- The producer's execution is wrapped inside try catch block, any thrown error will be received as the following state:
```javascript
state = {
  data: e,// the catched error
  status: "error",
  props: {}, // the producer's parameter when it was ran
}
```
:::

### How my app will look like with the library:
In general, here how you will be using the library:

- First you define your producer function (aka: reducer, saga, thunk...) and give it its unique name. This function shall
  receive a powerful single argument object called the `props` (or `argv`). This function may take any of the supported forms.
- Second, you define a provider that will host your asynchronous states and payload. It needs from you for every async state
  entry the following: `key`, `producer` and `initialValue` or a source object.
- Later, from any point in your app, you can use `useAsyncState(key)` or `useAsyncStateSelector(key)` to get the state
  based on your needs.

After mounting your app, it will more likely appear like this:

![img](/img/provider-app.png)

## Installation
The library is available as a package on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states
```
