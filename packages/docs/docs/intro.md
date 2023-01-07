---
sidebar_position: -100
sidebar_label: Intro
---
# React async states
> A multi-paradigm React state management library.

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

#### <ins>Multi-paradigm nature</ins>
The library can work with the following modes:

- `Imperative` and/or `declarative`
- `Synchronous` and/or `Asynchronous`
- Data fetching and/or any form of asynchrony
- Inside and/or outside `React`
- With or without `Cache`
- `Promises`, `async/await` and even `generators` or nothing at all
- Allows abstractions on top of it
- ...

#### <ins>Easy to use and Minimal API (`useAsyncState`).</ins>
The library has one main hook: `useAsyncState` which allows the creation,
subscription and manipulation of the desired state.
[Here is a sneak peek](/docs/api/the-whole-api#useasyncstate)
at this hook's full API.

The hooks signature is pretty familiar: a configuration and dependencies.

```typescript
useAsyncState(create, deps);
```

#### <ins>Tiny library with no dependencies and works in all environments</ins>
The library has no dependencies and very small on size compared to all the power
it gives, and it should target all environments (browser, node, native...).

#### <ins>Synchronous and asynchronous; Imperative and declarative support</ins>
The library adds the `status` property as part of the state, the possible values
are: `initial`, `pending`, `success`, `error` and `aborted`.

When your producer runs, it becomes asynchronous if the returned value is a
`Thenable` object. But, you can control the `pending` status: eg, skip it
totally if our promise resolves under `400ms`. Or skip it entirely if you want
to perform some `fetch-then-render` patterns.

The library allows you to perform declarative runs using `useAsyncState`
hook configuration, while also providing a multiple imperative `run` functions
with different signatures to answer your needs.

The following image shows the possible state transitions:

![img](/img/state-transitions.png)

#### <ins>Promises, async/await & generators support</ins>
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

[Here is a sneak peek](/docs/api/the-whole-api#producer) at the producer signature:

#### <ins>Automatic and friendly cancellations</ins>
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

#### <ins>Events and callbacks support</ins>
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

#### <ins>Dynamic creation and sharing of states at runtime</ins>
Any created state is accessible from the whole v8 scope under the key it was
given to it. So it is important to think about giving unique names to any
state you create.

#### <ins>Apply effects on runs: debounce, throttle...</ins>
To avoid creating additional state pieces and third party utilities,
the library has out-of-the box support for effects that can be applied to runs:
such as `debounce`, and `throttle` and `delay`.
This support allows you to create awesome user experience natively with the
minimum CPU and RAM fingerprints, without additional libraries or managed
variables. It just works in the core of the library. Of course, this requires
you to be in an environment where `setTimeout` exists.

```tsx
import {useAsyncState, RunEffect} from "react-async-states";

const {run} = useAsyncState({
  producer: userSearchByUsername,
  // debounce runs
  runEffect: RunEffect.debounce,
  runEffectDurationMs: 300,
  // skip pending status if it answers less than 200ms
  skipPendingDelayMs: 200,
});


<input onChange={e => run(e.target.value)} /* ... */ />
```

#### <ins>On-demand cache support</ins>
The library has a different cache support: it doesn't cache the value of you state,
rather, it caches your producer runs when they succeed by hashing the run `args`
and `payload`.

Let's add cache support to the previous example:

```tsx
import {useAsyncState, RunEffect} from "react-async-states";

// note that the whole configuration object does not depend on render
// and can be moved to module level static object.
const {run} = useAsyncState({
  producer: userSearchByUsername,
  // debounce runs
  runEffect: RunEffect.debounce,
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

#### <ins>Forks and lanes support</ins>
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

const {state: weatherState} = useAsyncState({key: "weather", fork: true});

```

#### <ins>Powerful selectors</ins>

The library has two ways to select data from states:
- via `useAsyncState`: it supports a `selector` configuration can accept the
  current state and the whole cache (you can decide to just work with cache, if you want to!)
- via `useSelector`: This hook allows you to select data from one or multiple
  pieces of states, it even allows combining `keys` and `source` object to select from them.
  It also can dynamically select states as they get created.

#### <ins>And many more</ins>

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

## Motivations
Managing state using React native APIs or third party libraries ain't an easy 
task. Let's talk about the parts we miss:

- Share state in all directions of your app.
- Combining synchronous and asynchronous effects.
- Automatically reset a state when you no longer use it.
- Dealing with concurrent asynchronous operations' callbacks.
- Dynamically share states, subscribe and have full control over them.
- Select a part of a state and re-render only when you decide that it changed.
- The need to add additional state values each time to represent loading and error states.
- Automatically cancel asynchronous operations when the component unmounts, or dependencies change.
- Cannot automatically declare and share a state from a component and subscribe to it from other parts of the app.

Without these aspects, your application will surely be in a mess, when you get
to see search results of the very early search operation, when you have to do
over-engineered stuff to support a simple thing such as cancelling a fetch request
and a lot of other messy stuff.

## Installation

The library is available as a package on NPM for use with a module bundler or in a Node application:

```bash title="NPM"
npm install react-async-states
```

```bash title="YARN"
yarn add react-async-states
```

```bash title="PNPM"
pnpm add react-async-states
```
