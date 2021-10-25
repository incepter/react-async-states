---
sidebar_position: 1
sidebar_label: Concepts
---

# Concepts

This library tries to automate and facilitate subscriptions to states along with their updates, while having the ability
to cancel and abort either automatically, by developer action or by user action.
Here is how you will be using it:

- First you define your promise function (aka: reducer, saga, thunk...) and give it its unique name. This function shall
  receive a powerful single argument object detailed in a few. This function may take any of the supported forms.
- Second, you define a provider that will host your asynchronous states and payload. It needs from you for every async state
  entry the following: `key`, `promise` and `initialValue` or a source object.
- Later, from any point in your app, you can use `useAsyncState(key)` or `useAsyncStateSelector(key)` to get the state
  based on your needs.

Of course, this is only the basic usage of the library, and the `useAsyncState` hook may be used in different forms
and serve different purposes:
- you may select only a portion of the state based on a `selector` and rerender only if `areEqual` is falsy.
- You may `hoist` an async state to the provider and become accessible.
- You may `fork` an async state and reuse its promise function without impacting its state and subscribers.
