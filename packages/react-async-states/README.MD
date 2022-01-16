# React async states

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
  areEqual,
  initialValue
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

## Get started

To get started using the library, please read [the docs](https://incepter.github.io/react-async-states/docs/intro).

The library is available as a package on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states
```

## Contribution

Please [get in touch.](https://twitter.com/incepterr)
