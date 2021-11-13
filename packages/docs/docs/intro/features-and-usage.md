---
sidebar_position: 1
sidebar_label: Features and usage
---

# Motivations and features

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

## Features
This library aims to facilitate working with [a]synchronous states while sharing them.
It was designed to help us reduce the needed boilerplate (code/files) to achieve great and effective results.

The main features that makes it special are:
- Minimal and Easy to use API.
- Tiny library with 0 dependencies, only react as a peer dependency, and should target all environments.
- Run, abort and replace state anytime.
- Dynamic creation and sharing of states at runtime.
- Share states inside and outside the context provider.
- Subscribe and react to selected portions of state while controlling when to re-render.
- Fork an asynchronous state to re-use its producer function without impacting its state value.
- Hoist states to provider on demand.
- Bidirectional abort binding that lets you register an `abort callback` from the producer function.
- Automatic cleanup/reset on dependencies change (includes unmount).
- Supports many forms on producer functions (async/await, promises, generators, reducers...).
- Powerful selectors system.

And many more features.


## Concepts

This library tries to automate and facilitate subscriptions to states along with their updates, while having the ability
to cancel and abort either automatically, by developer action or by user action.
Here is how you will be using it:

- First you define your producer function (aka: reducer, saga, thunk...) and give it its unique name. This function shall
  receive a powerful single argument object detailed in a few. This function may take any of the supported forms.
- Second, you define a provider that will host your asynchronous states and payload. It needs from you for every async state
  entry the following: `key`, `producer` and `initialValue` or a source object.
- Later, from any point in your app, you can use `useAsyncState(key)` or `useAsyncStateSelector(key)` to get the state
  based on your needs.

Of course, this is only the basic usage of the library, and the `useAsyncState` hook may be used in different forms
and serve different purposes:
- you may select only a portion of the state based on a `selector` and rerender only if `areEqual` is falsy.
- You may `hoist` an async state to the provider and become accessible.
- You may `fork` an async state and reuse its producer function without impacting its state and subscribers.

After mounting your app, it will more likely appear like this:

![img](/img/provider-app.png)

## Use cases

Use this library if you need to:

- Manage asynchronous states (status is handled automatically).
- Share states across you app (derived states, full control).
- Subscribe to a state defined outside the context provider (by source).
- Abort asynchronous operations.
- Register abort callbacks.
- Share dynamic states at runtime.
- Derive a portion of a state and decide when to re-render.
- Select from multiple states at once and control when to re-render.
- Fork or replicate behavior that generates state.
