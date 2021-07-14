## What is this
This package provides utilities to manage asynchronous states.

It provides shared-abortable and forkable asynchronous states.

The goal of this package is that developers should have less head-ache dealing with side effects.
In fact, you need to provide a unique name (the key) and a promise property:
that's a regular function returning a value (a reducer?), an asynchronous function, a function returning a promise
or even a generator. And an optional config property.

Under the hood, the package will wrap the result of your function in the appropriate runner manages it.

Using `AsyncStateProvider` you will be able to:

- define dynamic initial asynchronous states promises.
- register asynchronous states after the initial mount at any time.
- subscribe to any asynchronous state (you must have the key).
- batch multiple ongoing runs from subscribers.
- fork an asynchronous state (get the same behavior on a new state instance).
- abort any running asynchronous state.

When you subscribe to an asynchronous state using `useAsyncState`, you get to choose the dependencies (re-run)
and statuses in which you choose to re-render.

The asynchronous state may have the following states:

- `initial`: this is the very initial state
- `loading`: when it starts the loading state
- `success`: when it resolves successfully
- `aborted`: when you choose to abort your promise. (if it is still running, it forces the abort)
- `error`: when your promise rejects, function throws or generator throws during the call


## Motivations

## AsyncStateProvider

## useAsyncState

