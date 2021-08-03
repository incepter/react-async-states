### What is this

This library provides shared forkable and abortable asynchronous state management. It is a tiny implementation that answers
most of enterprise applications needs.

An asynchronous state is a state issued from a promise (may be other than the Promise object) that occur (or not) in
a later point of time. An async state instance holds three properties: `status(initial|loading|aborted|success|error)`,
`data` and `args` (the run arguments).

This library consists of a `Provider` that holds the asynchronous states definitions along with their promises,
and wires them via `useAsyncState` or `useAsyncStateSelector` hooks.

You may use `useAsyncState` hook in a tree without provider, and it works almost the same.

### Motivations

Dealing with asynchronous state in general isn't easy, and bad patterns emerge easily especially in large scale applications
where multiple developers with different seniority levels write code. The common and repetitive issues we were suffering from are:
- How to cancel an ongoing fetch automatically when component unmounts ?
- How to prevent a callback from being called when the dependencies used to trigger a fetch change ?
- Cannot update state of unmounted component...
- The fetch status is by far different from a boolean representation, and the most used in codebases
- How to share state between multiple subscriptions ?
- How to select from multiple changing states while re-rendering only if the selected value change given a memoization function
- ...and many more repetitive bottle necks that we found ourselves re-writing each time

So, while designing this library, we've kept in mind that we should make an api easy to use, and answers almost all of our needs.

We've gathered experience from the code we wrote before to handle both synchronous and asynchronous state, and tried to
deduce a pattern that will allow us to:

- Have dynamic async states at runtime
- Run any async state anytime
- Share dynamic state between subscribers
- Choose whether to re-render after a state update by status
- Abort running
- Support promises and generators and regular functions
- Support reducers
- Never call a callback from cleaned dependencies or unmounted component (aka: hunting cannot update state of unmounted component)
- Imperatively change/replace the state anytime
- Select a portion from a state along with memoization function
- Select from multiple states with the same api
- Wait for non existent states
- Give the running promise powerful arguments
- Allow usage of other libraries (like redux) while executing promises

### Main concepts and keywords
An `AsyncState` is constructed using the following:
- Its unique key
- The promise that yields the state data (may be an async function, a function returning a promise or a regular value or even a generator)
- lazy: (true by default) if false, your promise is ran whenever dependencies or payload change
- initialValue: self explanatory (when status is initial)


## standalone vs provider
The main API that you will be using often is the `useAsyncState` hook.
It has a similar declaration to react hooks (useHook(config,dependencies),
dependencies defaults to empty array for convenience, because we've found no real use case when you get to re-run a
promise function each render. So, to avoid unwanted errors, it was set to empty array. If we find a real use case,
we may allow null to act like undefined in this case)

It works in two modes:
- standalone mode (you are outside of a tree where a provider wires async states)
- inside a provider, when you get to listen to, share and fork hoisted states

The standalone mode simply reacts to your dependencies and constructs a new AsyncState instance, and subscribes to it.
The provider mode is a bit different, the first thing it does is to infer the `subscription mode` from the developer
configuration and the existing value in the provider.

## subscription mode
Although you won't have to use them, but it is important to know what happens under the hood and the base concept.

The possible subscription mode are:
- `LISTEN`: Listens to an existing async state from its key
- `HOIST`: Registers the async state in the provider, and subscribes to it (more like an injection)
- `STANDALONE`: Mimics the standalone mode
- `FORK`: Fork an existing async state in the provider
- `WAITING`: When the desired async state does not exist in provider, and you do not want to hoist it
- `NOOP`: If none of the above matches, should not happen

Don't worry, we'll get back to all of these modes in a while, because you should know when each one is picked.

## sharing and forking
You can subscribe to each async states and get notified when the state updates.
Sometimes, you need the same promise declared in an async state, but without changing the its state; this is supported via fork
where you take the same promise from the async state you are subscribed to, but without impacting state and subscribers.

## hoisting
Sometimes, you need to use an async state on-demand and share it in your whole application (aka inject?), this is possible
via the configuration property: `hoistToProvider`, that works with `hoistToProviderConfig` which is an object
accepting currently only a boolean `override` property, that indicates whether to override the existing in the provider

### Usage
## AsyncStateProvider
The provider in a nutshell does the following:
- holds the async states and allows subscription and selection
- holds a universal payload that's given to all async states

It accepts the `initialAsyncStates` as prop, which is an array of `{key, promise, lazy, initialValue}`, and
a `payload` object, that will be merged to every hoisted async state.

[The provider will(not confirmed) add special entries at a payload level (eg: `selectState(key)` will select asyncState state, `run(key, ...args)`
which will run another async state).]

This illustrates the power of the payload at the provider level: you may want to include the `{store, dispatch}`
from redux (or even `{put, select}` from redux-saga/effects and make them accessible at the provider level,
and of course, you will be using generators to write your the promise using these effects).

A direct use case of this `payload` is to hold the `matchParams`, the `location`, the `QueryString` and the `hash`,
these values will be then accessible to all promises like this if you like object destructuring:

```javascript
function* getUser(argv) {
  const { payload: {queryString, matchParams: {userId}}} = argv;
  const userData = yield fetchUser(userId, {queryString, ...otherStuffLikeSignal});
  return userData;
}
```

The initialAsyncStates, like stated, is an array of objects; let's create some
```javascript
let demoAsyncStates = {
  users: {
    key: "users",
    lazy: false,
    initialValue: [],
    promise: async function getUsers(argv) {
      return await fetchUsers(args.payload.queryString);
    },
  },
  userAndPosts: {
    key: "userAndPosts",
    // generators aren't yet supported, but are the recommended way to go!
    // because they allow to abort between yields! unlike promises and async-await
    promise: function* getUserAndPosts(argv) {
      let {userId} = argv.payload.matchParams;
      let user = yield fetchUser(userId);
      let posts = yield fetchUserPosts(userId);
      return {...user, posts};
    },
  },
  // with undefined promise, you will be calling `replaceState` to change the state
  somethingOpen: {
    key: "somethingOpen",
    initialValue: false,
  },
  localTodos: {
    key: "something",
    initialValue: {},
    promise: function todosReducerPromise(argv) {
      // myTodosReducer is a regular reducer(state, action) that returns the new state value, my guess is that you've wrote many
      return myTodosReducer(argv.lastSuccess, argv.executionArgs);
    }
  },
}
const initialAsyncState = Object.values(demoAsyncStates); // pass this to provider
```

PS: You can use `AsyncStateBuilder` to create these objects this way:

```javascript
import {AsyncStateBuilder, createAsyncState} from "react-async-states";
let usersAS = AsyncStateBuilder()
    .key("users")
    .lazy(false)
    .initialValue([])
    .promise(fetchUsersPromise)
    .build();
// or this way
let usersAs = createAsyncState(/* key */"users", /* promise */fetchUsersPromise, /* initialValue */ [], /** lazy **/ false);
```

Now that you know how to create an AsyncState's promise, let dive deeper.

## useAsyncState
## useAsyncStateSelector
