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
- States declared statically at module level whilst subscriptions is possible.
- Share state in all directions of a react app, inside and outside context providers.
- The need to add additional state values each time to represent loading and error states.
- Automatically cancel asynchronous operations when the component unmounts, or dependencies change.
- Cannot automatically share a state in a component and subscribe to it from other parts of the app.

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
- Fork an asynchronous state to re-use its promise function without impacting its state value.
- Hoist states to provider on demand.
- Bidirectional abort binding that lets you register an `abort callback` from the promise function.
- Automatic cleanup/reset on dependencies change (includes unmount).
- Supports many forms on promise functions (async/await, promises, generators, reducers...).
- Powerful selectors system.

And many more features.

## Use cases

