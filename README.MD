# React async states
> A naive lightweight React library for managing state.

## What is this ?
This is a library for decentralized state management in React.
It assumes that state is issued from a function called the `the producer function`.

The state value is then composed of three properties:

|Property|Type                                   |Description              |
|--------|---------------------------------------|-------------------------|
|`data`  |`T`                                    | The returned data from the `producer function` |
|`status`|`initial,pending,success,error,aborted`| The status of the state |
|`props`  |`propsObject`                           | The argument object that the producer was ran with |

To use the states provided by the library, you need to provide the following:

|Property        |Type                 |Description              |
|----------------|---------------------|-------------------------|
|`key`           |`string`             | The unique identifier of the async state |
|`producer`      |`producer function`  | Returns the state value of type `T` |
|`initialValue`  |`T`                  | The argument object that the producer was ran with |

The producer function may be:
- A regular function returning a `Promise` object.
- A regular function returning a value (reducers...).
- An asynchronous function with `async/await` syntax.
- A `generator`.

The `producer function` is called (either automatically or imperatively) and the state
is whatever this functions returns/throws at any point of time.
The state contains a `status` property because an asynchronous state status isn't a boolean
(`true/false` to indicate a pending state).

The APIs that you will be using most often are:

- [`useAsyncState`](#use-async-state): a hook that allows you to define and subscribe to asynchronous states, it works inside and outside a provider.
- [`AsyncStateProvider`](#async-provider): A component holding a set of asynchronous states, and allows subscriptions and extra controls and features.
- [`useAsyncStateSelector`](#use-async-state-selector): A selector that accepts enough parameters to make it very cool.

## Core concepts

## Minimal usage
Let's explore these APIs signatures first, it will give you the overall idea about the library.
```javascript
// configuration: string | object | function | source
function useAsyncState(configuration, dependencies = []) {
  // state is whatever your selector returns, by default will return the whole state object with props, data and status
  return { key, source, payload, run, abort, state, replaceState, mergePayload, runAsyncState };
}

// keys: string or array or function
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  // returns whathever the selector returns (or initialValue)
}
// initialAsyncStates: array or map of {key, producer, initialValue} or source objects
function AsyncStateProvider({ payload, initialAsyncStates, chidlren }) {}
```

Now, let's see what `useAsyncState` looks like when used to its fullest:

```javascript
const {
  key,
  source,

  state, // selector return
  run,
  lastSuccess,
  payload,

  abort,
  replaceState,
  mergePayload,

  runAsyncState,
} = useAsyncState({
  source: null,
  key: "my-key",
  initialValue: 0, // value or function

  hoistToProvider: false,
  hoistToProviderConfig: {override: false},
  fork: false,
  forkConfig: {keepState: true, key: "new-key"},

  rerenderStatus: {pending: true, success: true, error: true, aborted: true},

  selector: (currentState, lastSuccess) => currentState,
  areEqual: (prev, next) => prev === next,

  producer (props) {}
}, []);
```

This allows us to easily manage asynchronous state while having the ability to share it in all directions of a react app.
The following snippets are all valid use cases of useAsyncState hook:

```javascript
import {useAsyncState} from "react-async-states";

useAsyncState("current-user"); // subscribes or waits for the async state 'current-user' to appear in the provider
useAsyncState(() => fetchStoreData(storeId), [storeId]);// fetches store data whenever the store id changes
useAsyncState(async () => await fetchUserPosts(userId), [userId]);// fetches user posts

useAsyncState(function* getCurrentUser(props) {
  const user = yield fetchCurrentUser();
  const [permissions, stores] = yield Promise.all([fetchUserPermissions(user.id), fetchUserStores(user.id)]);
  return {user, permissions, stores};
})

useAsyncState({ key: "weather", selector: s => s.data });

useAsyncState();
```

## Getting started

## Motivations and features
This library aims to facilitate working with [a]synchronous states while sharing them.
It was designed to help us reduce the needed boilerplate (code/files) to achieve great results. The main features that
makes it special are:
- Minimal and Easy to use API.
- Tiny library with 0 dependencies, it only requests react as a peer dependency, and should target all environments.
- Run, abort and replace state anytime.
- Dynamic creation and sharing of states at runtime.
- Share states inside and outside the context provider.
- Subscribe and react to selected portions of state while controlling when to re-render.
- Fork an asynchronous state to re-use its producer function without impacting its state value.
- Hoist states to provider on demand.
- Bidirectional abort binding that lets you register an `abort callback` from the producer function.
- Automatic cleanup/reset on dependencies change (includes unmount).
- Supports many forms of producer functions (async/await, promises, generators, reducers...).
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
- [x] re-use old instances if nothing changed (originalProducer + key + lazy)
- [x] subscription to be aware of provider async states change, to re-connect and re-run lazy...
- [x] support the standalone/anonymous `useAsyncState(producer, dependencies)` ?
- [x] support default embedded provider payload (select, run other async states)[partially done, we need to define the payload properties]
- [x] support selector in useAsyncState configuration
- [x] support selector keys to be a function receiving available keys in provider(regex usage against keys may be used in this function)
- [x] enhance logging and add dev tools to visualize states transitions
- [ ] writing docs
- [ ] writing codesandbox usage examples
- [ ] support passive listen mode without running async state on deps change (if typeof config === string => simple listen)
- [ ] writing tests: only the core part is tested atm, not the react parts (although we kept a huge separation of concerns and the react fingerprint should be minimal)
- [ ] performance tests and optimizations
- [ ] add types for a better development experience
- [ ] support config at provider level for all async states to inherit it (we must define supported config)
- [ ] support concurrent mode to add a special mode with suspending abilities
- [ ] support server side rendering

A [trello board](https://trello.com/b/Xx23e0Dc/react-async-states) was created for better team organization.

## Core concepts

This library tries to automate and facilitate subscriptions to states along with their updates, while having the ability
to cancel and abort either automatically, by developer action or by user action.
Here is how you will be using it:

- First you define your producer function (aka: reducer, saga, thunk...) and give it its unique name. This function shall
receive a powerful single argument object detailed in a few. This function may take any of the supported forms.
- Second, you define a provider that will host your asynchronous states and payload. It needs from you for every async state
entry the following: `key`, `producer` and `initialValue` or a source object.
- Later, from any point in your app, you can use `useAsyncState(key)` or `useAsyncStateSelector(key)` to get the state
based on your needs.

Of course, this is only the basic usage of the library, and the `useAsyncState` hook may be used in different forms
and serve different purposes:
- you may select only a portion of the state based on a `selector` and rerender only if `areEqual` is falsy.
- You may `hoist` an async state to the provider and become accessible.
- You may `fork` an async state and reuse its producer function without impacting its state and subscribers.

## <a name="producer-function"></a> The producer function
This function may be:
- A regular function returning a value.
- A pure function returning a value based on the previous value (aka reducer).
- A generator (must return the state value).
- An asynchronous function using `async/await`.
- A regular function returning a `Promise` object.

The main goal and purpose is to run your function, it receives one argument like this:
```javascript
// somewhere in the code, simplified:
yourFunction({
  lastSuccess,

  args,
  payload,

  aborted,
  onAbort,
  abort
});
```

|Property            |Description              |
|--------------------|-------------------------|
|`payload`           | The merged payload from provider and all subscribers |
|`lastSuccess`       | The last success value that was registered |
|`args`              | Whatever arguments that the `run` function received when it was invoked |
|`aborted`           | If the request have been cancelled (by dependency change, unmount or user action) |
|`abort`             | Imperatively abort the producer while processing it, this may be helpful only if you are working with generators |
|`onAbort`           | Registers a callback that will be fired when the abort is invoked (like aborting a fetch request if the user aborts or component unmounts) |

We believe that these properties will solve all sort of possible use cases, in fact, your function will run while having
access to payload from the render, from either the provider and subscription, and can be merged imperatively anytime
using `mergePayload` obtained from `useAsyncstate`. And also, execution args if you run it manually (not automatic).

So basically you have three entry-points to your function (provider + subscription + exec args).

Your function will be notified with the cancellation by registering an `onAbort` callback, you can exploit this to abort
an `AbortController` which will lead your fetches to be cancelled, or to clear a timeout, for example.
The `aborted` property is a boolean that's truthy if this current run is aborted, you may want to use it before calling
a callback received from payload or execution arguments. If using a generator, only yielding is sufficient, since the
library internally checks on cancellation before stepping any further in the generator.

The following functions are all supported by the library:

```javascript
// retrives current user, his permissions and allowed stores before resolving
function* getCurrentUser(props) {
  const controller = new AbortController();
  const {signal} = controller;
  props.onAbort(function abortFetch() {
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

async function getCurrentUserPosts(props) {
  // [...] abort logic
  return await fetchUserPosts(props.payload.principal.id, {signal});
}

async function getTransactionsList(props) {
  // abort logic
  return await fetchUserTransactions(props.payload.principal.id, {query: props.payload.queryString, signal});
}

function timeout(props) {
  let timeoutId;
  props.onAbort(function clear() {
    clearTimeout(timeoutId);
  });

  return new Promise(function resolver(resolve) {
    const callback = () => resolve(invokeIfPresent(props.payload.callback));
    timeoutId = setTimeout(callback, props.payload.delay);
  });
}

function reducer(props) {
  const action = props.args[0];
  switch(action.type) {
    case type1: return {...props.lastSuccess.data, ...action.newData};
    case type2: return {...action.data};
    
    // mixed sync and async reducers is possible
    // case type3: return fetchSomething()
  }
}
```
You can even omit the producer function, it was supported along the with the `replaceState` API that we will see later.
If you attempt to run it, it will delegate to replaceState while passing the arguments.

## <a name="async-provider"></a> The provider `AsyncStateProvider`
To share the state returned from your producer function, you need a Provider to hold it.

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
|`producer`     |`function or undefined`|`undefined`   |The producer function|
|`initialValue`|`any`                  |`null`        |The state value when the status is `initial`|

The initialAsyncStates, like stated, is an array of objects or a map; let's create some:
```javascript
// pass this to provider
let demoAsyncStates = {
  users: {
    key: "users",
    initialValue: [],
    producer: async function getUsers(props) {
      return await fetchUsers(props.payload.queryString);
    },
  },
  currentUser: {
    key: "currentUser",
    // generators are the recommended way to go!
    // because they allow to abort between yields! unlike promises and async-await!
    producer: getCurrentUserGenerator,
  },
  // with undefined producer, you will be calling `replaceState` to change the state
  somethingOpen: {
    key: "somethingOpen",
    initialValue: false,
  },
  localTodos: {
    key: "something",
    initialValue: {},
    producer: function todosReducerPromise(props) {
      // myTodosReducer is a regular reducer(state, action) that returns the new state value, my guess is that you've wrote many
      return myTodosReducer(props.lastSuccess, ...props.args);
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
    .initialValue([])
    .producer(fetchUsers)
    .build();
// or this way
let usersAs = createAsyncState(/*key*/"users", /*producer*/fetchUsers, /*initialValue*/ []);
```

## <a name="use-async-state"></a> `useAsyncState`
This hook allows subscription to an async state, and represents the API that you will be interacting with the most.
Its signature is:

```javascript
function useAsyncState(configuration, dependencies) {}
```
It returns an object that contains few properties, we'll explore them in a moment.

### Standalone vs Provider
This hooks may be used inside and outside the provider and has almost the same behavior.

For example, you can use this hook to fetch the current user from your api before mounting the provider and pass the user
information to payload.

While being outside provider, it will expect you to use a producer function as configuration, or with an object defining
the producer and all other necessary information.

### Subscription modes
Many subscription modes are possible. You won't have to use them, but you should essentially
know what they mean and how your configuration impacts them for any debugging purposes.

What is a subscription mode already ?
When you call `useAsyncState` -every time your component renders- this hook reacts to the given configuration
synchronized by your dependencies. Then, tries to get the async state instance from the provider.

If not found, it may wait for it if you did not provide a `producer` function in your configuration, or fallback with a noop mode for example.

The possible subscription mode are:
- `LISTEN`: Listens to an existing async state from its key
- `HOIST`: Registers the async state in the provider, and subscribes to it (more like an injection)
- `STANDALONE`: Mimics the standalone mode
- `FORK`: Fork an existing async state in the provider
- `WAITING`: When the desired async state does not exist in provider, and you do not want to hoist it
- `SOURCE`: When you use a source object for subscription
- `SOURCE_FORK`: When you use a source object for subscription and you decide to fork it
- `OUTSIDE_PROVIDER`: When you call it outside the async state context provider
- `NOOP`: If none of the above matches, should not happen

If you are curious about how the subscription mode is inferred, please refer to the `inferSubscriptionMode` function
defined [here](./src/react/subscription/subscriptionUtils.js).

### Configuration and manipulation
The configuration argument may be a string, an object with supported properties, or a producer function (you won't be able to share it by this signature).
If it is a string, it is used inside provider to only listen on an async state, without automatically triggering the run
(but you can do it programmatically using what this hooks returns).
If an object is provided, it may act like a simple subscription or a registration of a new async state (with fork/hoist).

Let's see in details the supported configuration:

|Property               |Type         |Default Value       |Standalone|Provider|Description
|-----------------------|-------------|--------------------|----------|--------|------------------------------------------------|
|`key`                  |`string`     |`string`            |     x    |   x    | The unique key, either for definition or subscription |
|`lazy`                 |`boolean`    |`true`              |     x    |   x    | If false, the subscription will re-run every dependency change |
|`fork`                 |`boolean`    |`false`             |          |   x    | If true, subscription will fork own async state |
|`source`               |`object`     |`undefined`         |     x    |   x    | Subscribes to the hidden instance of async state in this special object |
|`producer`             |`function`   |`undefined`         |     x    |   x    | Our producer function |
|`selector`             |`function`   |`identity`          |     x    |   x    | receives state (`{data, args, status}`) as unique parameter and whatever it returns it is put in the state return |
|`areEqual`             |`function`   |`shallowEqual`      |     x    |   x    | `(prevValue, nextValue) => areEqual(prevValue, nextValue)` if it returns true, the render is skipped |
|`condition`            |`boolean`    |`true`              |     x    |   x    | If this condition is falsy, run will not be granted |
|`forkConfig`           |`ForkConfig` |`{keepState: false}`|          |   x    | defines whether to keep state when forking or not |
|`initialValue`         |`any`        |`null`              |     x    |        | The initial producer value, useful only if working as standalone(ie defining own producer) |
|`rerenderStats`        |`object`     |`{<status>: true}`  |     x    |   x    | Defines whether to register in the provider or not |
|`hoistToProvider`      |`boolean`    |`false`             |          |   x    | Defines whether to register in the provider or not |
|`hoistToProviderConfig`|`HoistConfig`|`{override: false}` |          |   x    | Defines whether to override an existing async state in provider while hoisting |

The returned object from useAsyncState contains the following properties:

|Property            |Description              |
|--------------------|-------------------------|
|`key`               | The key of the async state instance, if forked, it is different from the given one |
|`run`               | Imperatively trigger the run, arguments to this function are received as array in the execution args |
|`mode`              | The subscription mode |
|`state`             | The current selected portion of state, by default, the selector is `identity` and so the state is of shape `{status, args, data}` |
|`abort`             | Imperatively abort the current run if running |
|`source`            | The special source object of the subscribed async state instance, could be reused for further subscription without passing by provider or key |
|`payload`           | The async state instance payload (could be removed in the future) |
|`lastSuccess`       | The last registered success |
|`replaceState`      | Imperatively and instantly replace state as success with the given value (accepts a callback receiving the old state) |
|`mergePayload`      | Imperatively merge the payload of the subscribed async state instance with the object in first parameter |
|`runAsyncState`     | If inside provider, `runAsyncState(key, ...args)` runs the given async state by key with the later execution args |

We bet in this shape because it provides the key for further subscriptions, the current state with status, data and the
arguments that produced it. `run` runs the subscribed async state, to abort it invoke `abort`. The `lastSuccess`
holds for you the last succeeded value.

`replaceState` instantly gives a new value to the state with success status.
`runAsyncState` works only in provider, and was added as convenience to trigger some side effect after
the current async producer did something, for example, reload users list after updating a user successfully.

The `selector` as config in for `useAsyncState` allows you to subscribe to just a small portion of the state while
choosing when to trigger a rerender, this is an important feature and the probably the most important of this library.
It was not designed from the start, but the benefits from having it are noticeable and allowed new extensions for
the library itself.

Note :
- Calling the `run` function, if it is still `pending` the previous run, it aborts it instantly, and start a new cycle.

### Examples

Let's now make some examples using `useAsyncState`:

```javascript
import {useAsyncState} from "react-async-states";

// later and during render

// executes currentUserPromise on mount
const {state: {data, status}} = useAsyncState({key: "current-user", producer: currentUserPromise, lazy: false});

// subscribes to transactions list state
const {state: {data: transactions, status}} = useAsyncState("transactions");

// injects the users list state
const {state: {data, status}} = useAsyncState({key: "users-list", producer: usersListPromise, lazy: false, payload: {storeId}, hoistToProvider: true});

// forks the list of transactions for another store (for preview for example)
// this will create another async state issued from users-list -with a new key (forked)- without impacting its state
const {state: {data, status}} = useAsyncState({key: "users-list", payload: {anotherStoreId}, fork: true});

// reloads the user profile each time the match params change
// this assumes you have a variable in your path
// for example, once the user chooses a profile, just redirect to the new url => matchParams will change => refetch as non lazy
const matchParams = useParams();
const {state} = useAsuncState({
  ...userProfilePromiseConfig, // (key, producer), or take only the key if hoisted and no problem impacting the state
  lazy: false,
  payload: {matchParams}
}, [matchParams]);

// add element to existing state via replaceState
const {state: {data: myTodos}, replaceState} = useAsyncState("todos");
function addToDo(data) {
  replaceState(old => ({...old, [data.id]: data}));
}

// add element to existing state via run (may be a reducer)
// run in this case acts like a `dispatch`
const {state: {data: myTodos}, run} = useAsyncState("todos");

function addTodo(data) {
  run({type: ADD_TODO, payload: data});
}
function removeTodo(id) {
  run({type: REMOVE_TODO, payload: id});
}

// a standalone async state (even inside provider, not hoisted nor forked => standalone)
useAsyncState({
  key: "not_in_provider",
  payload: {
    delay: 2000,
    onSuccess() {
      showNotification();
    }
  },
  producer(props) {
    timeout(props.payload.delay)
      .then(function callSuccess() {
        if (!props.aborted) {
          // notice that we are taking onSuccess from payload, not from component's closure
          // that's the way to go, this creates a separation of concerns
          // and your producer may be extracted outisde this file, and will be easier to test
          // but in general, please avoid code like this, and make it like an effect reacting to a value
          // (the state data for example)
          props.payload.onSuccess();
        }
      })
  }
});

// hoists a controlled form to provider
useAsyncState({
  key: "some-form",
  producer(props) {
    const [name, value] = props.args;
    if (!name) {
      return props.lastSuccess.data;
    }
    return {...props.lastSuccess.data, [name]: value};
  },
  hoistToProvider: true,
  rerenderStatus: {pending: false, success: false},
  initialValue: {}
});
// later
<Input name="username" />
<Input name="password" />
<Input name="phoneNumber" />
// where
function Input({name, ...rest}) {
  const {state, run} = useAsyncState({
    key: "login-form",
    selector: state => state.data[name],
  }, [name]);
  return //...
}

```

### Other hooks
For convenience, we've added many other hooks with `useAsyncState` to help inline most of the situations: They inject
a configuration property which may facilitate using the library:

The following are all hooks with the same signature as `useAsyncState`, but each predefines something in the configuration:
- `useAsyncState.auto`: adds `lazy: false` to configuration
- `useAsyncState.lazy`: adds `lazy: true` to configuration
- `useAsyncState.fork`: adds `fork: true` to configuration
- `useAsyncState.hoist`: adds `hoistToProvider: true` to configuration
- `useAsyncState.hoistAuto`: adds `lazy: false, hoistToProvider: true` to configuration
- `useAsyncState.forkAudo`: adds `lazy: false, fork: true` to configuration

These are functions produce hooks with the same signature as `useAsyncState` (and hooks shortcuts with it)
while injecting specific properties. They do not work like the other shortcuts because they need an input for
the property from the developer:
- `useAsyncState.payload`: adds `payload` to configuration
- `useAsyncState.selector`: adds a selector
- `useAsyncState.condition`: make the run conditional

The following snippets results from the previous hooks:

```javascript
// automatically fetches the user's list when the search url changes
const {state: {status, data}, run, abort} = useAsyncState.auto(DOMAIN_USER_PRODUCERS.list.key, [search]);
// automatically fetches user 1 and selects data
const {state} = useAsyncState.selector(s => s.data).auto(user1Source);
// automatically fetches user 2 and selects its name
const {state} = useAsyncState.selector(name).auto(user2Source);
// automatically fetches user 3 and hoists it to provider and selects its name
const {state} = useAsyncState.payload({userId: 3}).selector(name).hoistAuto(userPayloadSource);
// forks userPayloadSource and runs it automatically with a new payload and selects the name from result
const {state} = useAsyncState.selector(name).payload({userId: 4}).forkAuto(userPayloadSource);
```


## <a name="use-async-state-selector"></a> Selectors via `useAsyncStateSelector`
Now that we know how to define and share asynchronous states (or states in general), what about selecting values
from multiple states at once, and derive its data. Let's get back to `useAsyncStateSelector` signature:

```javascript
// keys: string or array (or function: not yet)
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  // returns whathever the selector returns (or initialValue)
}
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

Let's explore the arguments one by one and see what we can with them:

- `keys`: the keys you need to derive state from, can be either a string or a single async state, and array of keys
or a function that will receive the keys being hoisted in the provider (should return a string or an array of strings).
- `selector`: will receive as many parameters (the async state state value) as the count of resulting keys.
- `areEqual`: This function receives the previous and current selected value, then re-renders only if the previous and current value are not equal.
- `initialValue`: The desired initial value if the selected value is falsy.

Notes:
- The selector subscribes to all desired async states, and runs whenever they notify it by recalculating the selected value.
- If one async state isn't found, its state value is `undefined`.
- If not found, the selector waits for an async state (the same if an async state is removed).

Examples: __todo__ add selectors examples.

## Contribution guide
