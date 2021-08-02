### What is this

This library provides shared forkable and abortable asynchronous state management. It is a tiny implementation that answers
most of enterprise applications needs.

An asynchronous state is a state issued from a promise (may be other than the Promise object) that occur (or not) in
a later point of time. An async state consists of three properties: `status(initial|loading|aborted|success|error)`,
`data` and `args` (the run arguments).

This library consists of a `Provider` that holds the asynchronous states definitions along with their promises,
and wires them via `useAsyncState` or `useAsyncStateSelector` hooks.

### Motivations
While designing this library, we've kept in mind that we should make an api easy to use, and answers almost all of our needs.
We've gathered experience from the code we wrote before to handle both synchronous and asynchronous state, and tried to
deduce a pattern that will allow us to:

- Run any async state anytime
- Share dynamic state between subscribers
- Choose whether to re-render after a state update by status
- Abort running
- Support promises and generators and regular functions
- Support reducers
- Imperatively change the state anytime
- Select a portion from a state along with memoization function
- Select from multiple states
- Wait for non existent states
- Give the promise context powerful arguments
- Allow usage of other libraries (like redux) while executing promise
- Never call a callback from cleaned dependencies or unmounted component (aka: hunting cannot update state of unmounted component)


### Main concepts and keywords
## subscription mode
## sharing and forking
## hoisting

### Usage
## AsyncStateProvider
## useAsyncState
## useAsyncStateSelector
