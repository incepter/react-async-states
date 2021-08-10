# React async states
> A naive lightweight React library for managing shared abortable and forkable asynchronous state.

## What is this ?
This is yet another library for state management in React. The difference is that is was built for asynchronous states
in the first place, and later, we found that synchronous/immediate state is one direct use case of async state.

This library assumes that the state is issued from a function. The function may be:
- A regular function returning a value.
- A pure function returning a value based on the previous value (aka reducer).
- A generator (must return the state value).
- An asynchronous function using `async/await`.
- A regular function returning a `Promise` object.

The state value is described using the following:
- `status`: refers to the current asynchronous state status, possible values are: `initial, loading, aborted, success, error`.
- `args`: refers to the arguments that the promise function was ran with (__todo__ link to promise function arguments).
- `data`: the state actual value.

So every state update sets all these three properties as `currentState` object.

This was set for convenience, because an asynchronous state status isn't a boolean (`true/false` to indicate a loading).
And also, sometimes you need to display at the loading state the parameters that are actually running the promise function
or may be you will need to replicate it in case of some error.

The most notable APIs that you will be using most often from this library are:

- `useAsyncState`: a hook that allows you to define and subscribe to an asynchronous state, it works inside
and outside a provider (__todo__ link hook).
- `AsyncStateProvider`: A component holding a set of asynchronous states, and allows extra controls and features (__todo__ link provider).
- `useAsyncStateSelector`: A selector that accepts enough parameters to make it very cool(__todo__ link selector).

## Minimal usage
Let's explore these APIs signatures first, it will give you the overall idea about the concept.
```javascript
// config: string | object | function
function useAsyncState(config, dependencies = []) {
  return { key, run, abort, state: {args, status, data}, replaceState, runAsyncState};
}

// keys: string or array (or function: not yet)
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  // returns whathever the selector returns (or initialValue)
}
// initialAsyncStates: array or map of {key, promise, initialValue, lazy}
function AsyncStateProvider({ payload, initialAsyncStates, chidlren }) {}
```

In our case, the dependencies array defaults to empty array rather than undefined, because we found that it is easily
forgotten, and there are nearly no valid use cases to re-run a function automatically (which most likely fetches data
from your api) each time the component renders. And also, the library provides other ways to run the promise every
render, if you insist!

```javascript
// this snippet will make your promise run every render, if you want.
// the `run` function returns its cleanup ;)
const {run} = useAsyncState(config);
React.useEffect(run);
```
PS: please note that depending on your promise and dependencies, you may fall into infinite loop of renders, like
the one you used to fall into while trying to learn `useEffect` in the very first days.

## Getting started

### Motivations and features
This library aims to facilitate working with asynchronous states (and states in general) while sharing them.
It was designed to help us reduce the needed boilerplate (code/files) to achieve great results. The main features that
makes it special are:
- Minimal and Easy to use API.
- Tiny library with 0 dependencies, it only requests react as a peer dependency, and should work in all environments.
- Run, abort and replace state anytime.
- Dynamic creation of states at runtime.
- Subscribe and react to state updates.
- Fork an asynchronous state to re-use its promise function without impacting its state value.
- Hoist states to provider on demand.
- Three entry-points to the promise function, through provider, own payload and execution args.
- Bidirectional abort binding that lets you register an abort callback from promise.
- Automatic cleanup on dependencies cleanup (includes unmount).
- Supports many forms on promise functions (async, promises, generators, reducers...).
- Powerful selectors system.

And many more features.

### Core concepts

### The promise function

### The provider `AsyncStateProvider`

### The subscription `useAsyncState`

#### Standalone vs Provider
#### Subscription modes
#### Subscription modes

### Selectors via `useAsyncStateSelector`

## Contribution

## Roadmap
