## What is this
This package provides utilities to manage asynchronous states.

It provides shared-interruptible and forkable asynchronous states.

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
- fork an asynchronous state (get the same behavior without impacting original state).
- abort any running asynchronous state.
- cleanup free: will unsubscribe from aborted calls to prevent any memory leak.

When you subscribe to an asynchronous state using `useAsyncState`, you get to choose the dependencies (re-run)
and statuses in which you choose to re-render.

The asynchronous state may have the following states:

- `initial`: this is the very initial state
- `pending`: when it starts the pending state
- `success`: when it resolves successfully
- `aborted`: when you choose to abort your promise. (if it is still running, it forces the abort)
- `error`: when your promise rejects, function throws or generator throws during the call

## Motivations
Sure managing side effects isn't an easy task, especially when it holds a shared state between multiple subscribers.
There is no enterprise application that does not use data fetching, and dealing with data fetching always was one of
the hardest things to deal with: What if it takes so long ? what is the users want to abort it ? how to share it between
several subscribers ? how to react to dependencies change ? what if it never resolves ? What if the subscribers
did unmount and the callback sets its state ? how to know the exact fetching status (not isLoading true|false)

You can solve these problems in various ways, but it involves code duplication.

This package aims to facilitate the sharing of asynchronous states, while providing all necessary arguments and payload
to operate (of course you have control over this).

## What this package isn't

This package isn't
- a data fetching library, it doesn't even care if you are working using promises or generators for example.
- isn't a state management library: this library shouldn't be confused with state management libraries such as redux or recoil

## Road map and features

The following features are intended to be implemented in the future. We try to keep code extensible to these features,
even if some appear to be impossible:

- useAsyncStateSelector: [HALF DONE] a selector from one or multiple states (selector should support memoization function, and only renders if necessary to optimize perf)
- support multiple runners: for generators
- enhance the developer experience
- forge the replace state API
- Docs: we need a provide proper and detailed docs with several examples
- support transitions
- support effects: debounce, throttle...
- concurrent-mode: we may be able to suspend subscribers if concurrent mode is enabled until the promise/gen resolves
- listeners: aka middlewares. they can intercept (readonly) any state change in any async state
- cache control: I don't know if this is a good idea or we should drop it
- control routing through async states

## AsyncStateProvider

The provider wires a `AsyncStateContext` in your tree, it accepts the following props:

|Prop                | PropType                  | Default value         | Usage                                     |
|--------------------|---------------------------|-----------------------|-------------------------------------------|
|`intialAsyncStates` | `ArrayOf AsyncStateProps` | `empty array`         | Asynchronous states hoisted at provider level
|`payload`           | `number`                  | `empty object`        | Whatever payload you want to pass at provider level
|`children`          | `any`                     | N/A                   | The react tree

## useAsyncState

Subscriptions to asynchronous states goes through this hook: `useAsyncState`


