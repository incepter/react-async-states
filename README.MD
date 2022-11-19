# React async states

## What is this ?
This is a multi-paradigm library for state management.

It aims to facilitate working with [a]synchronous states while sharing them.
It was designed to reduce the needed boilerplate to achieve great and effective
results.

It introduces a new concept: the `producer` that is similar to reducer, async
reducer or query from other libraries you might know, but with more power.

This library provides utilities for low level state manipulation, and other
libraries may appear just a small abstraction on top of it.

## Main features
The features that make this library special are:

### Multi-paradigm nature
The library can work with the following modes:

- `Imperative` and/or `declarative`
- `Synchronous` and/or `Asynchronous`
- Data fetching and/or any form of asynchrony
- Inside and/or outside `React`
- Inside and/or outside `React context provider`
- With or without `Cache`
- `Promises`, `async/await` and even `generators` or nothing at all
- Allows abstractions on top of it
- ...

### Easy to use and Minimal API (`useAsyncState`).
The library has one main hook: `useAsyncState` which allows the creation,
subscription and manipulation of the desired state.
[Here is a sneak peek](https://incepter.github.io/react-async-states/docs/api/the-whole-api#useasyncstate) 
at this hook's full API.

### Tiny library with no dependencies and works in all environments
The library has no dependencies and very small on size compared to all the power
it gives, and it should target all environments (browser, node, native...).

### Synchronous and asynchronous; Imperative and declarative support
The library adds the `status` property as part of the state, the possible values
are: `initial`, `pending`, `success`, `error` and `aborted`.

When your producer runs, it becomes asynchronous if the returned value is a
`Thenable` object. But, you can control the `pending` status: eg, skip it
totally if our promise resolves under `400ms`. Or skip it entirely if you want
to perform some `fetch-then-render` patterns.

The library allows you to perform declarative runs using `useAsyncState`
hook configuration, while also providing a multiple imperative `run` functions
with different signatures to answer your needs.

### Promises, async/await & generators support
The `producer`, the core concept of the library can be of different forms (you 
can even omit it and manipulate the state directly, without a producer function):

Either return a promise (thenable) to your state, use async/await syntax or go 
generators. All of these are supported by the library out of the box and 
no configuration is needed.

```typescript
useAsyncState();
useAsyncState(function getSomeData() {  return fetchMyData(); });
useAsyncState(function* someGenerator() {  yield fetchMyData(); });
useAsyncState(async function getSomeData() {  return await fetchMyData(); });
```

[Here is a sneak peek](https://incepter.github.io/react-async-states/docs/api/the-whole-api#producer) at the producer signature:

### Automatic and friendly cancellations
The library was designed from the start to support cancellations in a standard
way: an `onAbort` callback registration function that registers your callbacks,
that are invoked once your run is cancelled (either decoratively or imperatively).

In practice, we found ourselves writing the following, depending on context:
```typescript
onAbort((reason) => controller.abort(reason));
onAbort(() => socket.disconnect());
onAbort(() => worker.terminate());
onAbort(() => clearInterval(id));
onAbort(() => clearTimeout(id));
```

When your state loses all the subscriptions (and depending on the `resetStateOnDispose`)
configuration, it will go back to its initial state and aborting any ongoing run.
This behavior is opt-in, and it is not the default mode of the library.

### Events and callbacks support
The library supports two forms of imperative notifications when state is updated:

- Via `events` as a configuration of `useAsyncState`: This allows you to react
to updates occurring in a share piece of state.
- Via `runc` function: It allows having callbacks `per run`, not by subscription.

```typescript
import {useAsyncState} from "react-async-states";

const {runc} = useAsyncState({
  // ... config
  events: {
    change: [
      newState => console.log('state changed'), // will be invoked every state change
      {
        status: 'success', // handler will be invoked only in success status
        handler : (successState) => {},
      }
    ],
  }
})

// or per run callbacks:
runc({
  args: myOptionalArgs,
  onError : () => {},
  onSuccess : () => {},
  onAborted : () => {}, // not called when the abort status is bailed out
  // no onPending callback.
});
```

### Dynamic creation and sharing of states at runtime
Under the `AsyncStateProvider`, you can create and share state instances
and access them by their `key` via the `hoistToProvider` option.

You can even start listening to a state before it gets hoisted to the provider,
and get notified once it gets added.

### Works with or without a provider
The library can work without the provider and still share state via the
`source` special object.

### Apply effects or runs: debounce, throttle...
To avoid creating additional state pieces and third party utilities,
the library has out-of-the box support for effects that can be applied to runs:
such as `debounce`, and `throttle` and `delay`.
This support allows you to create awesome user experience natively with the 
minimum CPU and RAM fingerprints, without additional libraries or managed
variables. It just works in the core of the library. Of course, this requires
you to be in an environment where `setTimeout` exists.

```tsx
import {useAsyncState, ProducerRunEffects} from "react-async-states";

const {run} = useAsyncState({
  producer: userSearchByUsername,
  // debounce runs
  runEffect: ProducerRunEffects.debounce,
  runEffectDurationMs: 300,
  // skip pending status if it answers less than 200ms
  skipPendingDelayMs: 200,
});


<input onChange={e => run(e.target.value)} /* ... */ />
```

### On-demand cache support
The library has a different cache support: it doesn't cache the value of you state,
rather, it caches your producer runs when they succeed by hashing the run `args`
and `payload`.

Let's add cache support to the previous example:

```tsx
import {useAsyncState, ProducerRunEffects} from "react-async-states";

// note that the whole configuration object does not depend on render
// and can be moved to module level static object.
const {run} = useAsyncState({
  producer: userSearchByUsername,
  // debounce runs
  runEffect: ProducerRunEffects.debounce,
  runEffectDurationMs: 300,
  // skip pending status if it answers less than 200ms
  skipPendingDelayMs: 200,
  
  // cache config:
  cacheConfig: {
    enabled: true, // enable cache
    // run cache hash is the username passed to the producer, this allows to
    // have cached entries such as: `incepter` : { state: {data}}
    hash: (args) => args[0],
    getDeadline: (state) => state.data.maxAge || Infinity,
  }
});


<input onChange={e => run(e.target.value)} /* ... */ />
```

The library allows you also to `persist` and `load` cache, even asynchronously
and then do something in the `onCacheLoad` event.

### Forks and lanes support
Forking a state in the library means having a new state instance, with the same
producer, and probably the same cache (configurable), while having a new isolated
state with new subscribers.

The library has two ways for forks
- Normal forks: obtained by adding `fork: true` to `useAsyncState`, and these
are standalone states.
- Lanes: These are normal forks, but managed by their parent and share the same
cache, they can be enumerated from their parent via `source.getAllLanes`,
and removed by `source.removeLane`.

```typescript
import {useAsyncState, useSourceLane} from "react-async-states";

const references = createSource("refs", referencesProducer, {
  /* awesome config */
});

const {state} = useAsyncState({
  source: references,
  lane: 'cities',
  lazy: false
});
const {state} = useAsyncState({source: references, lane: 'roles', lazy: false});
// can be simplified to this:
const {state} = useSourceLane(references, 'roles');

// re-use a state with its producer called weather present in the provider
const {state: weatherState} = useAsyncState({key: "weather", fork: true});

```

### Powerful selectors

The library has two ways to select data from states:
- via `useAsyncState`: it supports a `selector` configuration can accept the
current state and the whole cache (you can decide to just work with cache, if you want to!)
- via `useSelector`: This hook allows you to select data from one or multiple
pieces of states, it even allows combining `keys` and `source` object to select from them.
It also can dynamically select states from the provider as they get hoisted.

### And many more

The previous examples are just a few subset of the library's power, there are
several other unique features like:

- Cascade runs and cancellations
- Run and wait for resolve
- Producer states that emit updates after resolve (such as websockets)
- Configurable state disposal and garbage collection
- React 18 support, and no tearing even without `useSES`
- StateBoundary and support for all three `render strategies`
- post subscribe and change events
- And many more..


## Get started

The library is available as a package on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states

# PNPM
pnpm add react-async-states
```

To get started using the library, please make sure to read [the docs](https://incepter.github.io/react-async-states/docs/intro).
[The tutorial section](https://incepter.github.io/react-async-states/docs/tutorial/first-steps) is a good starting point to get your hands dirty.


## Contribution

To contribute, please refer take a look at [the issues section](https://github.com/incepter/react-async-states/issues).
