---
sidebar_position: -100
sidebar_label: Intro
---
# React async states
> A multi-paradigm React state management library.

## What is this ?
This is a multi-paradigm library for decentralized state management in React.
It aims to facilitate and automate working with [a]synchronous states while sharing them.
It was designed to help us reduce the needed boilerplate (code/files)
to achieve great and effective results.

## Main features
The features that make this library special are:
- Easy to use and Minimal API (`useAsyncState`).
- Tiny library with 0 dependencies, only react as a peer dependency, 
  and should target all react environments.
- Run pure/side effects, abort them and/or replace state anytime.
- Run pure/side effects either declaratively via dependencies or imperatively.
- Contains state `status` by default (initial, pending, success, error & aborted).
- Supports many forms on functions (async/await, promises, generators, reducers...).
- Debounce and throttle calls.
- Bidirectional abort binding that lets you register an `abort callback` to 
  easily abort fetch requests or perform cleanups.
- Dynamic creation and sharing of states at runtime.
- Share states inside and outside the context provider.
- Subscribe and react to selected portions of state while 
  controlling when to re-render.
- Fork an asynchronous state to re-use its function without
  impacting the original state value.
- Hoist states to provider on demand (aka: injection).
- Supports cache, async cache loading and persisting.
- Automatic cleanup/reset on dependencies change (includes unmount).
- React 18+ friendly (already supported through the `read()` API)
- Powerful selectors.


## Concepts and definitions

The library gives you the state value and full control over it,
the state of the library is composed of four properties:
`status`, `data`, `props` and `timestamp`,
where the `data` is returned (or `thrown`) 
from your function: called the `the producer function`.

### What is a producer function ?
The producer function is a javascript function, and it is responsible for
returning the state's `data`.

```typescript
export type Producer<T> =
  ((props: ProducerProps<T>) => (T | Promise<T> | Generator<any, T, any>));
```

It may be:
- A regular function returning a `Promise` or `thenable` object.
- A regular function returning a value (reducers, async reducers, mixed...).
- An asynchronous function with `async/await` syntax.
- A `generator` (sagas...).
- `undefined` to replace the state synchronously any time with the desired value.

### What is the library's state shape:
The library's state value is composed of four properties:

| Property    | Type                                    | Description                                                      |
|-------------|-----------------------------------------|------------------------------------------------------------------|
| `data`      | `T`                                     | The returned data from the `producer function`                   |
| `status`    | `initial,pending,success,error,aborted` | The status of the state                                          |
| `props`     | `ProducerProps`                         | The argument object that the producer was ran with (the `props`) |
| `timestamp` | `number`                                | the time (`Date.now()`) where the state was constructed          |

### What are the possible state transitions:
The following image shows the possible state transitions:

![img](/img/state-transitions.png)

:::note
1- The library supports synchronous states as well.

If the producer function returns a value besides a `Promise` or a `Generator`,
it is considered synchronous and pass directly to `success` or `error` state.

2- The producer's execution is wrapped inside try catch block, so any thrown
error will be received as state with `error` status:
```javascript
state = {
  data: e,// the catched error
  status: "error",
  props: {}, // the producer's parameter when it was ran
  timestamp: 123,
}
```
:::

### How my app will look like with the library:
In general, here how you will be using the library:

- First you define your producer function (aka: reducer, saga, thunk...) 
  and give it its unique name. This function shall
  receive a powerful single argument object called the `props` (or `argv`).
  This function may take any of the supported forms.
- Second, you define a provider that will host your asynchronous states and payload.
  It needs from you for every async state entry the following:
  `key`, `producer` and `initialValue` or a source object.
- Later, from any point in your app, you can use `useAsyncState(key)`
  or `useAsyncStateSelector(key)` to get the state
  based on your needs.

After mounting your app, it will more likely appear like this:

![img](/img/provider-app.png)

## Motivations
Managing state using React native APIs or third party libraries ain't an easy 
task. Let's talk about the parts we miss:

- Combining synchronous and asynchronous effects.
- Automatically reset a state when you no longer use it.
- Dealing with concurrent asynchronous operations' callbacks.
- Dynamically share states, subscribe and have full control over them.
- Select a part of a state and re-render only when you decide that it changed.
- Share state in all directions of a react app, inside and outside context providers.
- The need to add additional state values each time to represent loading and error states.
- Automatically cancel asynchronous operations when the component unmounts, or dependencies change.
- Cannot automatically declare and share a state from a component and subscribe to it from other parts of the app.

Without these aspects, your application will surely be in a mess, when you get
to see search results of the very early search operation, when you have to do
over-engineered stuff to support a simple thing such as cancelling a fetch request
and a lot of other messy stuff.

## Installation
The library is available as a package on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states
```
