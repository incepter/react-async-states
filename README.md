# React async states
> A naive lightweight React library for managing shared abortable and forkable asynchronous state.


## What is this

An asynchronous state is a state issued from a promise (may be other than the Promise object) that occur (or not) in
a later point of time. An async state instance holds three properties: `status(initial|loading|aborted|success|error)`,
`data` and `args` (the run arguments).

This library consists of a `Provider` that holds the asynchronous states definitions along with their promises,
and wires them via `useAsyncState` or `useAsyncStateSelector` hooks.

You may use `useAsyncState` hook in a tree without provider, and it works almost the same.

## Motivations

Dealing with asynchronous state in general isn't easy, bad patterns emerge easily especially in large scale applications
where multiple developers with different seniority levels write code. Some of the common and repetitive issues we were suffering from are:

- How to cancel an ongoing fetch automatically when component unmounts ? Or when the user chooses to ?
- How to prevent a callback from being called when the dependencies used to trigger a fetch change ?
- The: Cannot update state of unmounted component...
- The fetch status is by far different from a boolean representation, and the most used in code-bases...
- How to share state between multiple subscriptions ?
- How to select from multiple changing states while re-rendering only if the selected value change given a memoization function
- ...and many more repetitive bottle necks that we found ourselves re-writing each time

So, while designing this library, we've kept in mind that we should make an api easy to use, and answers almost all of our needs.

We've gathered experience from the code we wrote before to handle both synchronous and asynchronous state, and tried to
deduce a pattern that will allow us to:

- Have dynamic async states at runtime
- Run any async state anytime
- Give the running promise powerful arguments
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
- Allow usage of other libraries (like redux) while executing promises

## Main concepts and keywords
An `AsyncState` instance is constructed using the following:
- Its unique key
- The promise that yields the state data (may be an async function, a function returning a promise or a regular value or even a generator)
- lazy: (true by default) if false, your promise is ran whenever dependencies or payload change
- initialValue: self explanatory (when status is initial)

### The promise
The promise concept used in this text doesn't refer technically to the `Promise` object in Javascript, but rather to a
value that we will receive in the future, but the starting point is a function call.

### Standalone vs provider
The main API that you will be using often is the `useAsyncState` hook.
It has a similar declaration to react hooks (`useHook(config,dependencies)`). Except that dependencies defaults
to empty array, because we've found no real use case when you get to re-run a promise function each render.
So, to avoid unwanted errors, it was set to empty array for convenience. If we find a real use case,
we may allow null to act like undefined in this case)

It works in two modes:
- standalone mode (you are outside of a tree where a provider wires async states)
- inside a provider, when you get to listen to, share and fork hoisted states

The standalone mode simply reacts to your dependencies and runs the promise.
The provider mode is a bit different, the first thing it does is to infer the `subscription mode` from the given
configuration and the existing value in the provider.

### Subscription mode
Although you won't have to use them, but it is important to know what happens under the hood and the base concept.

The possible subscription mode are:
- `LISTEN`: Listens to an existing async state from its key
- `HOIST`: Registers the async state in the provider, and subscribes to it (more like an injection)
- `STANDALONE`: Mimics the standalone mode
- `FORK`: Fork an existing async state in the provider
- `WAITING`: When the desired async state does not exist in provider, and you do not want to hoist it
- `NOOP`: If none of the above matches, should not happen

Don't worry, we'll get back to all of these modes in a while, because you should know when each one is picked.

### Sharing and forking
You can subscribe to each async states and get notified when the state updates, while configuring what status triggers a re-render.

Sometimes, you need the same promise declared in an async state, but without changing the its state; this is supported via fork
where you take the same promise from the async state you are subscribed to, but without impacting its state and subscribers.

### Hoisting
Sometimes, you need to use an async state on-demand and share it in your whole application (aka inject?), this is possible
via the configuration property: `hoistToProvider`, that works with `hoistToProviderConfig` which is an object
accepting currently only a boolean `override` property, that indicates whether to override the existing in the provider

## Usage
### The promise
So, we run a promise (or function if you prefer) given an arguments object (that we will explore in a minute).
This function can be a regular function returning a value (a reducer maybe ?), an async function using async-await syntax,
or even a generator. The most important thing is that your function (promise) returns a value.
The returned value is what you receive as state data. We will explore the returned data more in depth later.

For now, let's explore the object argument's properties that your promise will receive:

```javascript
function myPromise(argv) {
    const { payload, lastSuccess, executionArgs, aborted, abort, onAbort } = argv;
    // ...
}
```

|Property            |Description              |
|--------------------|-------------------------|
|`payload`           | The merged payload from provider and all subscribers |
|`lastSuccess`       | The last success value that was registered |
|`executionArgs`     | Whatever arguments that the `run` function received when it was invoked |
|`aborted`           | If the request have been cancelled (by dependency change, unmount or user action) |
|`abort`             | Imperatively abort the promise while processing it, this may be helpful only if you are working with generators |
|`onAbort`           | Registers a callback that will be fired when the abort is invoked (like aborting a fetch request if the user aborts or component unmounts) |

The payload may contain in the future utilities to connect your promise to other async states: select data and run other promises. But it is not confirmed yet.

We bet on this structure to handle our use cases, in fact, it allows to:
- have a snapshot of the last success
- send anything at the `run`-time to your promise `executionArgs`
- combining the two previous benefits, a reducer signature may be like `myReducer(currentSuccess, executionArgs)`.
There is a special export `createReducerPromise` that does exactly this. It allows you to write reducers and accept
two arguments based on the arguments object. The reducer may be decorated with `immer`.
- dynamic declarative arguments go inside payload, and should be added dependencies to the subscription
- bi-directional abort binding: you can abort from your promise and/or register a callback to be fired if the abort is
by user action, or some unmount or dependency change.
- `aborted` alerted, you can then decide not to call a second fetch after the first resolves using this property.
- easy to remember state for incremental states (combined states, infinite lists...) via the `lastSuccess`

So far, so good.

Moreover, the state can be instantly and imperatively set to success status using a value
(or of course a function accepting the old value as parameter) via the `replaceState` utility.

Calling promises this way will encourage a separation of concerns, in fact, it will receive the whole outside world
as the first argument. This will make the promise easier to test/mock independently.

### AsyncStateProvider
The provider in a nutshell does the following:
- holds the async states and allows subscription and selection
- holds a universal payload that's given to all async states

It accepts the `initialAsyncStates` as prop, which is an array of `{key, promise, lazy, initialValue}`, and
a `payload` object, that will be merged to every hoisted async state.

[The provider will (not confirmed) add special entries at a payload level (eg: `selectState(key)` will select asyncState state, `run(key, ...args)`
which will run another async state).]

This illustrates the power of the payload at the provider level: you may want to include the `{store, dispatch}`
from redux.

A direct use case of this `payload` is to contain the `matchParams`, the `location`, the `QueryString`, the `hash`
or even information about the current user and his permissions. These values will be then accessible to all promises.
 You may use them like this:

```javascript
function* getUser(argv) {
  const { payload: {queryString, matchParams: {userId}}} = argv;
  const userData = yield fetchUser(userId, {queryString, ...otherStuffLikeSignal});
  return userData;
}
```

The initialAsyncStates, like stated, is an array of objects or a map; let's create some
```javascript
// pass this to provider
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
    // generators are the recommended way to go!
    // because they allow to abort between yields! unlike promises and async-await!
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
const initialAsyncState = Object.values(demoAsyncStates); // or pass this to provider
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
let usersAs = createAsyncState(/*key*/"users", /*promise*/fetchUsersPromise, /*initialValue*/ [], /**lazy**/ false);
```

Now that you know how to create an AsyncState's promise, let create explore the provider.

#### Props

|Prop                | PropType                                                     | Default value| Usage            |
|--------------------|--------------------------------------------------------------|--------------|------------------|
|`payload`           | `Map<any, any>`                                              | `{}`         | Payload at provider level, will be accessible to all hoisted async states |
|`initialAsyncStates`| `AsyncStateDefinition[] or Map<string, AsyncStateDefinition>`| `[]`         | The initial Map or array of definitions of async promises |
|`children`          | `ReactElement`                                               | `undefined`  | The React tree inside this provider |

The first thing it does, it reacts to the both `initialAsyncState`, if changed, a new map is reconstructed,
and the old is thrown to garbage collector (we may include optimizations to keep unchanged references).

When the async states Map change, the provider dispose of non-initially hoisted async states, and then constructs
the context value.

### useAsyncState
This hook allows subscription to async state, and represents the API that you will be interacting with the most.
its signature is one of the following:

```javascript
function useAsyncState(configuration, dependencies) {}
```
The configuration may be a string, an object with supported properties, or even a function returning one of them
(under discussion, what about: if configuration is a function, consider it an anonymous promise, because anyways,
a function returning a string or an object isn't interesting).

It returns an object that contains few properties, we'll explore them in a moment.

These are basic usages:
```javascript
// subscribes to users
const value = useAsyncState("users");
// creates a hoisted non-lazy async state with key and payload
const value = useAsyncState({
  lazy: false,
  hoistToProvider: true,
  key: "transactions-1-2",
  payload: { stores: [store1, store2]},
  hoistToProviderConfig: {override: true}
}, [store1, store2]);
// forks the weather promise
const value = useAsyncState({
  fork: true,
  key: "weather",
  forkConfig: {keepState: false},
  payload: {latitude, longitude}
});
// + replaceState
const value = useAsyncState("input_name");
// define promise
const value = useAsyncState({
  key: "not_in_provider",
  payload: {
    delay: 2000,
    onSuccess() {
      showNotification();
    }
  },
  promise(argv) {
    timeout(argv.payload.delay)
    .then(function callSuccess() {
      if (!argv.aborted) {
        // notice that we are taking onSuccess from payload, not from component's closure
        // that's the way to go, this creates a separation of concerns
        // and your promise may be extracted outisde this file, and will be easier to test
        // but in general, please avoid code like this, and make it like an effect reacting to a value
        // (the state data for example)
        argv.payload.onSuccess();
      }
    })
  }
});
```

The `useAsyncState` hook's supported configuration is:

|Property               |Type       |Default Value     |Standalone|Provider|Description
|-----------------------|-----------|------------------|----------|--------|------------------------------------------------|
|`key`                  |string     |sting             |     x    |   x    | The unique key, either for definition or subscription |
|`lazy`                 |boolean    |true              |     x    |   x    | If false, the subscription will re-run every dependency change |
|`fork`                 |boolean    |false             |          |   x    | If true, subscription will fork own async state |
|`promise`              |function   |undefined         |     x    |   x    | Our promise function |
|`condition`            |boolean    |true              |     x    |   x    | If this condition is falsy, run will not be granted |
|`forkConfig`           |ForkConfig |{keepState: false}|          |   x    | defines whether to keep state when forking or not |
|`initialValue`         |any        |null              |     x    |        | The initial promise value, useful only if working as standalone(ie defining own promise) |
|`hoistToProvider`      |boolean    |false             |          |   x    | Defines whether to register in the provider or not |
|`rerenderStats`        |object     |{<status>: true}  |     x    |   x    | Defines whether to register in the provider or not |
|`hoistToProviderConfig`|HoistConfig|{override: false} |          |   x    | Defines whether to override an existing async state in provider while hoisting |

The returned object from useAsyncState contains the following properties:

|Property            |Description              |
|--------------------|-------------------------|
|`key`               | The key of the async state instance, if forked, it is different from the given one |
|`run`               | Imperatively trigger the run, arguments to this function are received as array in the executionArgs |
|`state`             | The current state, of shape {status, data, args} |
|`abort`             | Imperatively abort the current run if running |
|`lastSuccess`       | The last registered success |
|`replaceState`      | Imperatively and instantly replace state as success with the given value (accepts a callback receiving the old state) |
|`runAsyncState`     | If inside provider, `runAsyncState(key, ...args)` runs the given async state by key with the later arguments |

We bet in this shape because it provides the key for further subscriptions, the current state with status, data and the
arguments that produced it. `run` runs the subscribed async state, to abort it invoke `abort`. The `lastSuccess`
holds for you the last succeeded value.
`replaceState` instantly gives a new value to the state with success status.
`runAsyncState` works only in provider, and was added as convenience to trigger some side effect after
the current async promise did something, for example, reload users list after updating a user successfully.

Notes:
1. Calling the `run` function, if it is still `loading` the previous run, it aborts it instantly, and start a new cycle.
2. The provider doesn't run promises, it is the `useAsyncState` that does it. But then, if you have multiple subscriptions
to the same async state, will it run multiple times ? Yes, and No. Yes because technically you register a run, but the run
is locked via sempahore lock on the event loop: This means that each time you call the run function automatically via
dependency change of first subscription, the only done thing synchronously is to lock by incrementing, and effectively
run using `Promise.resolve().then(runner)`; Let's put this simplified:
```javascript
// deep inside

function theRunYouCall(id) {
  const as = get(id);
  asyncSempahoreLockedRun(as);
}
function asyncSempahoreLockedRun(as) {
  // ...
  lock(); // ++
  // ...
  function cleanup() {}
  // ...
  function runner() {
    if (locked) unlock(); // --
    if (!locked) as.run();
  }
  // ...
  Promise.resolve().then(runner);
  return cleanup();
}
```
This allows all runs issued from the same render to be batched together. This won't work if one subscription if deferred,
if it runs while running, the natural implemented behavior is to cancel the previous. To solve this, you may fork the
previous async state, or even, we could introduce some new mode to passively listen (do not trigger any run).

### useAsyncStateSelector

Probably this is the most exciting API about this library, let's explore its signature first:

```javascript
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {}
// where
function shallowEqual(prev, next) {
  return prev === next;
}
function identity(...args) {
  if (!args || !args.length) {
    return undefined;
  }
  return args.length === 1 ? args[0] : args;
}
```

So, you may have deduced how this selector works:

It takes a key or multiple keys, subscribes to them (or wait for them), selects value using the selector function,
that receives as many arguments as many passed keys. If found, it gives the current `state`, else `undefined`.
Then, when a change occur to any state, the selector function is re-ran, and new selected value is deduced.
If it is different from the previous one given the `areEqual` function, your component re-renders.

This gives full control about selecting derived data from one or multiple states at once.

## Debugging

We are currently adding some configurable logging, and planning to add a small dev tools
extension with a UI representation for better developer experience.

## todo and roadmap
- [x] support generators
- [x] re-use old instances if nothing changed (originalPromise + key + lazy)
- [x] subscription to be aware of provider async states change, to re-connect and re-run lazy...
- [x] support the standalone/anonymous `useAsyncState(promise, dependencies)` ? [not confirmed][under discussion] We need a way to configure initialValue and lazy
- [x] support default embedded provider payload (select, run other async states) [we need more discussion over here since i spot a runAndWait that forks and runs an async promise inside a promise... that may be cool]
- [ ] support passive listen mode without running async state
- [ ] support config at provider level for all async states to inherit it (we must define supported config)
- [ ] tests
- [ ] Types
