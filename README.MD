# React async states

## What is this ?
This is a multi-paradigm library for state management.

It aims to facilitate working with [a]synchronous states while sharing them.
It was designed to reduce the needed boilerplate to achieve great and effective
results.

It introduces a new concept: the `producer` that is similar to reducer, async
reducer or query from other libraries you might know, but with more power.

This library provides utilities for low level state manipulation, and other
libraries may appear just a small abstraction on top of it.

## Main features
The features that make this library special are:

### Easy to use and Minimal API (`useAsyncState`).
The library has one main hook: `useAsyncState` which allows the creation,
subscription and manipulation of the desired state.
[Here is a sneak peek](https://incepter.github.io/react-async-states/docs/api/the-whole-api#useasyncstate) 
at this hook full API.

### Tiny library with no dependencies and works in all environments
The library has no dependencies and very small on size compared to all the power
it gives, and it should target all environments (browser, node, native...).

### Synchronous and asynchronous; Imperative and declarative support
The library adds the `status` property as part of the state, the possible values
are: `initial`, `pending`, `success`, `error` and `aborted`.

When your producer runs, it becomes asynchronous if the returned value is a
`Thenable` object. But, you can control the `pending` status: eg, skip it
totally if our promise resolves under `400ms`. Or skip it entirely if you want
to perform some `fetch-then-render` patterns.

The library allows you to perform declarative runs using `useAsyncState`
hook configuration, while also providing a multiple imperative `run` functions
with different signatures to answer your needs.

### Promises, async/await & generators support
The `producer`, the core concept of the library can be of different forms (you 
can even omit it and manipulate the state directly, without a producer function):

Either return a promise (thenable) to your state, use async/await syntax or go 
generators. All of these are supported by the library out of the box and 
no configuration is needed.

```typescript
useAsyncState();
useAsyncState(function getSomeData() {  return fetchMyData(); });
useAsyncState(function* someGenerator() {  yield fetchMyData(); });
useAsyncState(async function getSomeData() {  return await fetchMyData(); });
```

[Here is a sneak peek](https://incepter.github.io/react-async-states/docs/api/the-whole-api#producer) at the producer signature:

### Automatic and friendly cancellations
The library was designed from the start to support cancellations in a standard
way: an `onAbort` callback registration function that registers your callbacks,
that are invoked once your run is cancelled (either decoratively or imperatively).

In practice, we found ourselves writing the following, depending on context:
```typescript
onAbort((reason) => controller.abort(reason));
onAbort(() => socket.disconnect());
onAbort(() => worker.terminate());
onAbort(() => clearInterval(id));
onAbort(() => clearTimeout(id));
```

When your state loses all the subscriptions (and depending on the `resetStateOnDispose`)
configuration, it will go back to its initial state and aborting any ongoing run.
This behavior is opt-in, and it is not the default mode of the library.

### Events and callbacks support
The library supports two forms of imperative notifications when state is updated:

- Via `events` as a configuration of `useAsyncState`: This allows you to react
to updates occurring in a share piece of state.
- Via `runc` function: It allows having callbacks `per run`, not by subscription.

```typescript
import {useAsyncState} from "react-async-states";

const {runc} = useAsyncState({
  // ... config
  events: {
    change: [
      newState => console.log('state changed'), // will be invoked every state change
      {
        status: 'success', // handler will be invoked only in success status
        handler : (successState) => {},
      }
    ],
  }
})

// or per run callbacks:
runc({
  args: myOptionalArgs,
  onError : () => {},
  onSuccess : () => {},
  onAborted : () => {}, // not called when the abort status is bailed out
  // no onPending callback.
});
```

### Dynamic creation and sharing of states at runtime


### Works with or without a provider

### Apply effects or runs: debounce, throttle...

### On-demand cache support

### Forks and lanes support

### Powerful selectors

### And many more


## Get started

To get started using the library, please make sure to read [the docs](https://incepter.github.io/react-async-states/docs/intro).
[The tutorial section](https://incepter.github.io/react-async-states/docs/tutorial/first-steps) is a good starting point to get your hands dirty.

The library is available as a package on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states
```


## Use cases

The library supports several paradigms, which allows it to support almost
every use case you can think of.

In a nutshell, the library can manage:
- Synchronous and asynchronous states
- Cancellations
- State sharing
- Selectors
- Caching
- Inside and outside provider
- Run effects such as debounce and throttle
- Events

[This section of the docs](https://incepter.github.io/react-async-states/docs/use-cases/) tells more about this.

## Contribution

To contribute, please refer take a look at [the issues section](https://github.com/incepter/react-async-states/issues).
