---
sidebar_position: 1
sidebar_label: Intro
---
# React async states
> A naive lightweight React library for managing state.

## What is this ?
This is a library for decentralized state management in React.
It assumes that state is issued from a function call with a unique `argv` parameter (called the `the promise function`).

The state is then composed of three properties:
- `data`: the state's actual value, holds what the function returns if `success`, the error in case of `error`...
- `status`: refers to the current asynchronous state status, possible values are: `initial, pending, aborted, success, error`.
- `argv`: refers to the `argv` that the promise function was ran with.

The function may be:
- A regular function returning a value.
- A pure function returning a value based on the previous value (aka reducer).
- A generator.
- An asynchronous function with `async/await` syntax.
- A regular function returning a `Promise` object.

The `promise function` is called (either automatically or imperatively) with an argv parameter, and the state
is whatever this functions returns/throws at any point of time.
The state contains a `status` property because an asynchronous state status isn't a boolean
(`true/false` to indicate a pending state).

The APIs that you will be using most often are:

- `useAsyncState`: a hook that allows you to define and subscribe to asynchronous states, it works inside and outside a provider.
- `AsyncStateProvider`: A component holding a set of asynchronous states, and allows subscriptions and extra controls and features.
- `useAsyncStateSelector`: A selector that accepts enough parameters to make it very cool.
