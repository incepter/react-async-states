---
sidebar_position: 2
sidebar_label: How the library works
---
# How the library works

This section should be relevant only if you wish to contribute to the library,
or you are looking for inspiration, or may be a curious guys that wants to know
the under the hood of things.


## `AsyncState`
The library, like so many others, uses the publisher/subscriber design pattern
naively without any intelligence (for now).

The library stores the state in an object from a constructor called `AsyncState`,
when the state updates, the subscribed components schedule a rerender.

When constructed, the async state performs the following actions:
- Initialize its properties
- Wraps the given producer function with the library's logic
- Loads cache (is asynchronous, `.then`)

### `run`
The `run` function declares some closure variables that it will be using,
declares the props object and add running from producer capabilities, the 
emit function, the array of scheduled abort callbacks and declares also the abort
function and binds it to the instance as `currentAborter`.

Then it calls your producer, and returns the abort callback.
The abort callback gets invalidated once the producer resolves.

Before doing any of that, the run checks on the config,
whether it should apply some effects, like `debounce` and `throttle`/

The library when running with cache enabled, if it finds the hashed value
it just sets it as state.

The function that wraps your producer function supports thenables and async await
and promises and generators, and even a falsy value, which falls back to `replaceState`

### `replaceState`

`replaceState` replaces the state imperatively with a state updater function
(or value) and the desired status. It aborts any pending runs.

### `dispose`

Each subscribing component disposes of the async state when it no longer uses it,
when it reaches zero subscribers, the async state returns to its initial state.

## `Source`
The source object is constructed from the `AsyncState`'s instance.

It is a javascript object having a key and uniqueId, and a hidden property
that holds a reference to the async state instance itself.

That property is pretty well hidden using a constructor created in a closure
using a weak map vault with a private key static object.

The library knows how to read that source object and how to subscribe to it.

May be in the future, this source object is very compatible with `useSyncExternalStore`
and we could add new hooks supporting this shortcut.

When used with `useAsyncState`, it no longer cares whether its inside provider (that's a lie)
or not, it just subscribes to the async state instance.

## `AsyncStateProvider`
