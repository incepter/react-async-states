# React async states

## What is this ?
This is a multi-paradigm library for decentralized state management in React.
It aims to facilitate and automate working with [a]synchronous states while
sharing them. It was designed to reduce the needed boilerplate to
achieve great and effective results.

## Main features
The features that make this library special are:

- Easy to use and Minimal API (`useAsyncState`).
- Tiny library with 0 dependencies, only react as a peer dependency.
- Targets all react/javascript environments.
- Cancellations friendly (`props.onAbort(cb)`)
- Designed to support concurrency
- Supports many forms on functions (async/await, promises, generators, reducers)
- Run [side] effects either declaratively or imperatively.
- Built-in `status` in the state (initial, pending, success, error and aborted).
- Built-in `debounce` and `throttle`.
- Cache support.
- Events support.
- Dynamic creation and sharing of states at runtime.
- Share states inside and outside the provider without store.
- Subscribe and react to `selected` portions of state while controlling
  when to re-render.
- Fork the state to have same behavior with separate subscribers.
- Lanes support to have several `grouped` states sharing the same cache.
- Hoist states to provider on demand at runtime.
- Automatic cleanup/reset on dependencies change (includes unmount).
- React 18+ friendly (already supported through the `read()` API).
- Powerful selectors.

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
