# React async states

> A multi-paradigm React state management library.

## What is this ?

This is a multi-paradigm library for state management.

It aims to facilitate working non only with asynchronous states, but only the
synchronous ones. It was designed to reduce the need boilerplate to achieve
great, predictable and effective results.

## Main features

#### <ins>Multi-paradigm nature</ins>

The library can work with the following modes:

- `Imperative` and/or `declarative`
- `Synchronous` and/or `Asynchronous`
- Data fetching and/or any form of asynchrony
- Inside and/or outside `React`
- With or without `Cache`
- Sync, `Promises`, `async/await` or nothing at all
- Allows abstractions on top of it
- ...

#### <ins>Easy to use and Minimal API (`useAsync`).</ins>

The main hook of the library: `useAsync` allows the creation,
subscription and manipulation of the desired state.

The hooks signature is pretty familiar: a configuration and dependencies.

```typescript
useAsync(create, deps);
```

#### <ins>Tiny, no dependencies and targets all environments</ins>

The library has no dependencies and very small on size compared to all the power
it gives, and it should target all environments (browser, node, native...).

#### <ins>Synchronous and asynchronous</ins>

The library adds the `status` property as part of the state, the possible values
are: `initial`, `pending`, `success` and `error`.

When your function runs, it becomes asynchronous if the returned value is a
`promise`. Or else, it passes synchronously to the resolving state.

You can also control the `pending` status by skipping it in certain cases: let's
say you API answered very fast (for example, less than 300ms) in this case
there will be no transition to the pending state. Of course, this is an opt-in
behavior via the `skipPendingDelayMs` configuration.

#### <ins>Familiar</ins>

The library was designed to look familiar to you. For example, the main hook
that you will interact with has a signature similar to the hooks you've been
using in React the whole time. ie:

```tsx
const result = useAsync(options, dependencies);
```

The library default dependencies are an empty array for convenience.

The result given by the previous hook are also similar to other libraries you
may have used before, such as react-query, redux toolkit query or apolo client:

```tsx
const { isPending, data, error } = useAsync(config, deps);
```

Of course, the library has many other things that will cover all your needs.

#### <ins>Promises, async/await</ins>
The `producer`, the core concept of the library can be of different forms:

It can be a sync function such as a variant of a reducer, or return a promise
(thenable) to your state or use async/await syntax.

```typescript
useAsync();
useAsync(function getSomeData() {
  return fetchMyData();
});
useAsync(async function getSomeData() {
  return await fetchMyData();
});
```

It is important to note that the previous writing won't trigger or run your
function, on the contrary to some other libraries that requires you to control
it via an `enabled` flag. This library uses the `lazy` flag, which defaults to
true. In order to make it automatic, you need to provide a `lazy: false` option.

#### <ins>Automatic and friendly cancellations</ins>

The library was designed from the start to support cancellations in a standard
way: an `onAbort` callback registration function that registers your callbacks,
that are invoked once your run is cancelled (or manually).

In practice, we found ourselves writing the following, depending on context:

```typescript
onAbort(() => socket.disconnect());
onAbort(() => worker.terminate());
onAbort(() => clearInterval(id));
onAbort(() => clearTimeout(id));
```

#### <ins>Apply effects on runs such as debounce and throttle</ins>

To avoid creating additional state pieces and third party utilities,
the library has out-of-the box support for effects that can be applied to runs:
such as `debounce`, and `throttle` and `delay`.

This support allows you to create awesome user experience natively with the
minimum CPU and RAM fingerprints, without additional libraries or managed
variables.

```tsx
import { useAsync } from "react-async-states";

const {
  source: { run },
} = useAsync({
  producer: searchUserByName,

  // debounce runs for 300ms
  runEffect: "debounce",
  runEffectDurationMs: 300,

  // skip pending status under 200ms
  skipPendingDelayMs: 200,

  // stay in pending state for at least 500ms if you enter it
  keepPendingForMs: 500,
});

<input onChange={(e) => run(e.target.value)} /* ... */ />;
```

#### <ins>On-demand cache support</ins>

Obviously, there is cache. But that's opt-in via the `cacheConfig.enabled`
configuration to avoid unexpected behavior due to existing cache.

Let's add cache support to the previous example:

```tsx
import { useAsync } from "react-async-states";

// note that the whole configuration object does not depend on render
// and can be moved to module level static object.
const {
  source: { run },
} = useAsync({
  producer: searchUserByName,

  // debounce runs for 300ms
  runEffect: "debounce",
  runEffectDurationMs: 300,

  // skip pending status under 200ms
  skipPendingDelayMs: 200,

  // stay in pending state for at least 500ms if you enter it
  keepPendingForMs: 500,

  // cache config:
  cacheConfig: {
    // enable cache
    enabled: true,

    // run cache hash is the username passed to the producer, this allows to
    // have cached entries such as: `incepter` : { state: {data}}
    hash: (args) => args[0],

    // this is a successful state. Only success states are cached
    // The library uses Infinity as a default cached timeout
    timeout: (state) => state.data.maxAge || 60 * 5_000,

    // automatically run the function again after the cache is expired
    // this is not applicable to Infinity.
    auto: true,
  },
});

<input onChange={(e) => run(e.target.value)} /* ... */ />;
```

The library allows you also to `persist` and `load` cache, even asynchronously
and even do something in the `onCacheLoad` event.

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

Managing state using React APIs or third party libraries ain't an easy task.
Let's talk about the parts we miss:

- Share state in all directions of your app.
- Combining synchronous and asynchronous effects in a single library.
- Automatically reset a state when you no longer use it.
- Dealing with concurrent asynchronous operations' callbacks.
- Run functions with different arguments, anytime.
- Dynamically share states, subscribe and have full control over them.
- Select a part of a state and re-render only when you decide that it changed.
- Automatically cancel asynchronous operations when the component unmounts,
  or dependencies change.

## Installation

The library is available as a package on NPM for use with a module bundler or
in a Node application:

```bash title="NPM"
npm install async-states react-async-states
```

```bash title="YARN"
yarn add async-states react-async-states
```

```bash title="PNPM"
pnpm add async-states react-async-states
```

To get started using the library, please make sure to read [the docs](https://incepter.github.io/react-async-states/docs/intro).
[The tutorial section](https://incepter.github.io/react-async-states/docs/tutorial/first-steps) is a good starting point to get your hands dirty.

## Contribution

To contribute, please refer take a look at [the issues section](https://github.com/incepter/react-async-states/issues).

By [@incepter](https://twitter.com/incepterr), with 💜
