---
sidebar_position: 2
sidebar_label: Create source
---
# createSource
`createSource` is a utility provided by the library that creates instances
of shared states.

If used at a module level, it will give you a state that is accessible from
all over your application.

If you are curious how it works, you can read [it here](/docs/faq/how-the-library-works#how-source-works-).

```typescript
import {createSource, useAsyncState, useRun} from "react-async-states";

const connectedUser = createSource("principal", getUserProducer);

// later, at any part of the app
useAsyncState(connectedUser);
// or
useAsyncState({source: connectedUser, ...otherConfig});

// and you can even controle it like this:
const run = useRun();
// from anywhere down in the tree:
run(connectedUser, ...args);

// or even from inside another producer:
props.run(connectedUser, {payload: { userId: 5 }, fork: true,})

// notice that you can define this producer in a way that get's a user
// and when nothing provided can fallback to the current user.
// later, you can re-use a fork of it while providing the user id.
async function getUserProducer(props) {
  // ... setup
  const userId = props.payload?.userId ?? "me";
  // ... return fetch
}
```

`createSource` accepts three parameters:

| Property        | Type                | Description                                        |
|-----------------|---------------------|----------------------------------------------------|
| `key`           | `string`            | The unique identifier of the async state           |
| `producer`      | `producer function` | Returns the state value of type `T`                |
| `configuration` | `ProducerConfig`    | The argument object that the producer was ran with |

The supported configuration is:

| Property              | Type                                       | Description                                                                                                                                                                  |
|-----------------------|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `initialValue`        | `T`                                        | The initial value or the initializer of the state (status = `initial`)                                                                                                       |
| `runEffect`           | `oneOf('debounce', 'throttle', undefined)` | An effect to apply when running the producer, can be used to debounce or throttle                                                                                            |
| `runEffectDurationMs` | `number > 0` or `undefined`                | The debounce/throttle duration                                                                                                                                               |
| `skipPendingDelayMs`  | `number > 0` or `undefined`                | The duration under which a state update with a pending status may be skipped. The component in this case won't render with a pending status if it gets updated to something else under that duration. |
| `cacheConfig`         | `CacheConfig`                              | The cache config                                                                                                                                                             |

Where the supported cache config is:

| Property      | Type                                                              | Description                                                                    |
|---------------|-------------------------------------------------------------------|--------------------------------------------------------------------------------|
| `enabled`     | `boolean`                                                         | Whether to enable cache or not                                                 |
| `hash`        | `(args?: any[], payload?: {[id: string]: any} or null) => string` | a function to calculate a hash for a producer run (from args and payload)      |
| `getDeadline` | `(currentState: State<T>) => number`                              | returns the deadline after which the cache is invalid                          |
| `load`        | `() => {[id: AsyncStateKey]: CachedState<T>}`                     | loads the cached data when the async state instance is created                 |
| `persist`     | `(cache: {[id: AsyncStateKey]: CachedState<T>}) => void`          | a function to persist the whole cache, called when state is updated to success |
