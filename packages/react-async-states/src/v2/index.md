In this file, I will go through the v2 philosophy and API.

# `useAsync`

The useAsync hook's signature will be something similar to this:

```typescript
const {

key,
source,
version,
uniqueId,

state, // kept as a source of truth and because it has "props" and "timestamp"
lastSuccess,

data,
error,

isInitial, // data is initialValue
isPending, // data and error are whatever they were before
isSuccess, // data is T
isError, // error is E

read,
onChange,
onSubscribe

flags,
devFlags,
} = useAsync(config, deps);
```

These are the most common usages that we will have:

```ts
// with some object config
const {data, isPending} = useAsync(config);
const {data, error, isPending, source: {run}} = useAsync(config);

// with no config at all, a useState on steroids
const {data, source: {setState}} = useAsync();

// with a plain string key
const {data} = useAsync("users-list");
const {data, isPending} = useAsync("current-user");


// the famous one:

const {data, isPending, source: {run} = useAsync({
  lazy: false,
  key: "user-search",
  runEffect: "debounce",
  skipPendingForMs: 300,
  keepPendingDelayMs: 300,
  runEffectDurationMs: 300,
  cache: { hash: (args) => args[0] },
  producer: ({ args: [query], signal }) => searchUser(query, { signal }),
});

// later, in an event handler
run(query);

// in a nested component, to connect to the same state just do:
useAsync("user-search");
useAsync(getSource("user-search"));

```

# `useData`
`useData` is a new hook that's designed to give you the data directly when
using react concurrent features.

This hook will suspend your component when `pending`, and throw an error if
your producer throws.

usage example:

```ts
const users = useData({
  key: "users-list",
  producer: searchUsers,
  autoRunArgs: [searchQuery],
});

const users = useData("users-list");
const users = useData(usersListSource);
```


# Philosophy

## Core instance and `createSource`
`createSource` used to create an object holding a state that's used.

The idea of the v2 is that `createSource` will create just a `shell` that's
bound to a `LibraryContext`. When you manipulate the shell, it lookups for
the instance from the `Context` that was run in, then if not present will
initialize the state and perform the operation.

Look at this code:

```ts
// this source object is just a shell and has no state
let source = createSource("users-list", searchUsers, someConfig);

// assume that you do this code at module level
// getState will consider the top level (global) library context, and will
// initialize a state called users-list, and return its value
// if the state with that name already exists, the initialization is skipped
let state = source.getState();

// same as before, but the state now is created, so initialization is skipped
let abort = source.run(query);


// Inside components
// When used inside react and in components, there are several cases
// 1 - You dont have a AsyncProvider up in the tree: In this case, a global
//     context is created and used. Same as the first time you call createSource
//     on module level without any custom context.
// 2 - AsyncProvider exists and no custom 'context' is provided: in this case
//     the retrieved source is a BoundSource to the execution context.
//     This should allow a good experience with server side stuff.
```




























