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

## Motivations and features
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

## Library status
`react-async-states` is in its early phases, where we've boxed more or less the features we would like it to have.
It is far from complete, we do not recommend using it in production at the moment, unless
you are a core contributor or a believer in the concepts and you want to explore it while having the ability to be
blocked by a bug or an unsupported feature, and wait for it to be released/fixed.

Having a stable release will require a lot of more work to be done, as actual contributors do not have enough time.
Here is the road map and the list of things that should be added before talking about a stable release (or if you wish to contribute):

- [x] support generators
- [x] re-use old instances if nothing changed (originalPromise + key + lazy)
- [x] subscription to be aware of provider async states change, to re-connect and re-run lazy...
- [x] support the standalone/anonymous `useAsyncState(promise, dependencies)` ?
- [x] support default embedded provider payload (select, run other async states)[partially done, we need to define the payload properties]
- [ ] writing docs
- [ ] writing codesandbox usage examples
- [ ] support selector keys to be a function receiving available keys in provider(regex usage against keys may be used in this function)
- [ ] support passive listen mode without running async state on deps change (if typeof config === string => simple listen)
- [ ] writing tests: only the core part is tested atm, not the react parts (although we kept a huge separation of concerns and the react finger print should be minimal)
- [ ] enhance logging and add dev tools to visualize states transitions
- [ ] performance tests and optimizations
- [ ] add types for a better development experience
- [ ] support config at provider level for all async states to inherit it (we must define supported config)
- [ ] support concurrent mode to add a special mode with suspending abilities
- [ ] support server side rendering

## Core concepts
__todo__

This library tries to automate and facilitate subscriptions to states along with their updates, while having the ability
to cancel and abort either automatically, by developer action or by user action.
Here is how you will be using it:

- First you define your promise function (aka: reducer, saga, thunk...) and give it its unique name. This function shall
receive a powerful single argument object detailed in a few. This function may take any of the supported forms.
- Second, you define a provider that will host your asynchronous states and payload. It needs from you for every async state
entry the following: `key`, `promise`, `lazy` and `initialValue`.
- Later, from any point in your app, you can use `useAsyncState(key)` or `useAsyncStateSelector(key)` to get the state
based on your needs.

Of course, this is only the basic usage of the library, and the `useAsyncState` hook may be used in different forms
and serve different purposes:
- You may `hoist` an async state to the provider and become accessible.
- You may `fork` an async state and reuse its promise function without impacting its state and subscribers.

## The promise function
The main goal and purpose is to run your function, let's see what it receives:
```javascript
// somewhere in the code, simplified:
yourFunction({
  lastSuccess,

  payload,
  executionArgs,

  aborted,
  onAbort,
  abort
});
```

|Property            |Description              |
|--------------------|-------------------------|
|`payload`           | The merged payload from provider and all subscribers |
|`lastSuccess`       | The last success value that was registered |
|`executionArgs`     | Whatever arguments that the `run` function received when it was invoked |
|`aborted`           | If the request have been cancelled (by dependency change, unmount or user action) |
|`abort`             | Imperatively abort the promise while processing it, this may be helpful only if you are working with generators |
|`onAbort`           | Registers a callback that will be fired when the abort is invoked (like aborting a fetch request if the user aborts or component unmounts) |

We believe that these properties will solve all sort of possible use cases, in fact, your function will run while having
access to payload from the render, from either the provider and subscription. And also, execution args if you run it manually (not automatic).

So basically you have three entry-points to your function (provider + subscription + exec args).

Your function will be notified with the cancellation by registering an `onAbort` callback, you can exploit this to abort
an `AbortController` which will lead your fetches to be cancelled, or to clear a timeout, for example.
The `aborted` property is a boolean that's truthy if this current run is aborted, you may want to use it before calling
a callback received from payload or execution arguments. If using a generator, only yielding is sufficient, since the
library internally checks on cancellation before executing any step.

The following functions are all supported by the library:

```javascript
// retrives current user, his permissions and allowed stores before resolving
function* getCurrentUser(argv) {
  const controller = new AbortController();
  const {signal} = controller;
  argv.onAbort(function abortFetch() {
    controller.abort();
  });

  const userData = yield fetchCurrentUser({signal});
  const [permissions, stores] = yield Promise.all([
    fetchUserPermissions(userData.id, {signal}),
    fetchUserStores(userData.id, {signal}),
  ]);

  return {
    stores,
    permissions,
    user: userData,
  };
}

async function getCurrentUserPosts(argv) {
  // abort logic
  return await fetchUserPosts(argv.payload.principal.id, {signal});
}

function timeout(argv) {
  let timeoutId;
  argv.onAbort(function clear() {
    clearTimeout(timeoutId);
  });

  return new Promise(function resolver(resolve) {
    function callback() {
      resolve(argv.payload.callback());
    }
    timeoutId = setTimeout(callback, argv.payload.delay);
  });
}

function reducer(argv) {
  const action = argv.executionArgs[0];
  switch(action.type) {
    case type1: return {...argv.lastSuccess.data, ...action.newData};
    case type2: return {...action.data};
  }
}
```
You can even omit the promise function, it will do nothing if you run it, not even transitioning the state.
It was supported along the with the `replaceState` API that we will see later.

Although, we recommend using generators to write your promise functions, because they will be instantly aborted if needed.

## The provider `AsyncStateProvider`
To share the state returned from your promise function, you need a Provider to hold it.

The main purpose of the provider is:
- To hold the async states and allows subscription and selection
- To hold a universal payload that's given to all registered async states

It accepts the following props:

|Prop                | PropType                                                     | Default value| Usage            |
|--------------------|--------------------------------------------------------------|--------------|------------------|
|`payload`           | `Map<any, any>`                                              | `{}`         | Payload at provider level, will be accessible to all hoisted async states |
|`initialAsyncStates`| `AsyncStateDefinition[] or Map<string, AsyncStateDefinition>`| `[]`         | The initial Map or array of definitions of async states |
|`children`          | `ReactElement`                                               | `undefined`  | The React tree inside this provider |

To define an async state for the provider, you need the following:

|Property      | Type                  | Default value| Description            |
|--------------|-----------------------|--------------|------------------------|
|`key`         |`string`               |`undefined`   |The unique identifier or the name of the async state|
|`promise`     |`function or undefined`|`undefined`   |The promise function|
|`lazy`        |`boolean`              |`true`        |Defines whether to run the promise function or not when a subscription occurs|
|`initialValue`|`any`                  |`null`        |The state value when the status is `initial`|

The initialAsyncStates, like stated, is an array of objects or a map; let's create some:
```javascript
// pass this to provider
let demoAsyncStates = {
  users: {
    key: "users",
    lazy: false,
    initialValue: [],
    promise: async function getUsers(argv) {
      return await fetchUsers(argv.payload.queryString);
    },
  },
  currentUser: {
    key: "currentUser",
    lazy: false,
    // generators are the recommended way to go!
    // because they allow to abort between yields! unlike promises and async-await!
    promise: getCurrentUserGenerator,
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
      return myTodosReducer(argv.lastSuccess, ...argv.executionArgs);
    }
  },
}
const initialAsyncState = Object.values(demoAsyncStates); // or pass this to provider
```

PS: You can use `AsyncStateBuilder` or `createAsyncState` to create these objects this way:

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

## `useAsyncState`
This hook allows subscription to async state, and represents the API that you will be interacting with the most.
Its signature is:

```javascript
function useAsyncState(configuration, dependencies) {}
```
It returns an object that contains few properties, we'll explore them in a moment.

### Standalone vs Provider
This hooks may be used inside and outside the provider, you won't be able to share it if outside the provider, but it has
the same behavior.

For example, you can use this hook to fetch the current user from your api before mounting the provider and pass the user
information to payload.

While being outside provider, it will expect you to use a promise function as configuration, or with an object defining
the promise and all other necessary information.

### Subscription modes
While inside provider, many subscription modes are possible. You won't have to use them, but you should essentially
know what they mean and how your configuration impacts them.

What is a subscription mode already ?
When you call `useAsyncState`, please recall that you call it every time your component renders, and should react to
the given configuration synchronized with your dependencies. Then, this hook tries to get the async state from the provider.
If not found, it may wait for it if you did not present a `promise` function in your configuration, or fallback with a noop mode for example.

The possible subscription mode are:
- `LISTEN`: Listens to an existing async state from its key
- `HOIST`: Registers the async state in the provider, and subscribes to it (more like an injection)
- `STANDALONE`: Mimics the standalone mode
- `FORK`: Fork an existing async state in the provider
- `WAITING`: When the desired async state does not exist in provider, and you do not want to hoist it
- `NOOP`: If none of the above matches, should not happen

If you are curious about how the subscription mode is inferred, please refer to the `inferSubscriptionMode` function
defined [here](./src/react/subscription/subscriptionUtils.js).

### configuration and manipulation
The configuration argument may be a string, an object with supported properties, or a promise function (you won't be able to share it by this signature).
If it is a string, it is used inside provider to only listen on an async state, without automatically triggering the run
(but you can do it programmatically using what this hooks returns).
If an object is provided, it may act like a simple subscription or a registration of a new async state (with fork/hoist).

Let's see in details the supported configuration:

|Property               |Type       |Default Value     |Standalone|Provider|Description
|-----------------------|-----------|------------------|----------|--------|------------------------------------------------|
|`key`                  |string     |sting             |     x    |   x    | The unique key, either for definition or subscription |
|`lazy`                 |boolean    |true              |     x    |   x    | If false, the subscription will re-run every dependency change |
|`fork`                 |boolean    |false             |          |   x    | If true, subscription will fork own async state |
|`promise`              |function   |undefined         |     x    |   x    | Our promise function |
|`condition`            |boolean    |true              |     x    |   x    | If this condition is falsy, run will not be granted |
|`forkConfig`           |ForkConfig |{keepState: false}|          |   x    | defines whether to keep state when forking or not |
|`initialValue`         |any        |null              |     x    |        | The initial promise value, useful only if working as standalone(ie defining own promise) |
|`rerenderStats`        |object     |{<status>: true}  |     x    |   x    | Defines whether to register in the provider or not |
|`hoistToProvider`      |boolean    |false             |          |   x    | Defines whether to register in the provider or not |
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

### examples

## Selectors via `useAsyncStateSelector`

## Contribution guide

## Roadmap
