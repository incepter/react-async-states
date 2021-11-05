---
sidebar_position: 2
sidebar_label: Minimal usage
---

# Minimal usage

Let's explore the APIs signatures, it will give you the overall idea about the library.

## AsyncStateProvider

The provider allows you to register dynamic states and subscribe
```javascript
// initialAsyncStates: array or map of {key, producer, initialValue} or source objects
function AsyncStateProvider({ payload, initialAsyncStates, chidlren }) {}
```
## useAsyncState
```javascript
// configuration: string | object | function | source
function useAsyncState(configuration, dependencies = []) {
  // state is whatever your selector returns, by default will return the whole state object with argv, data and status
  return { key, mode, source, payload, run, abort, state, replaceState, mergePayload, runAsyncState };
}
```
## useAsyncStateSelector
```javascript
// keys: string | source | array of string|source | function returning source | string | array of source|string
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  // returns whathever the selector returns (or initialValue)
}
```

In our case, the dependencies array defaults to `empty array` rather than undefined, because we found that it is easily
forgotten, and there are nearly no valid use cases to re-run an function automatically (which most likely fetches data
from your api) each time the component renders. And also, the library provides other ways to run the producer every
render, if you insist!

```javascript
// this snippet will make your producer run every render, if you want.
// the `run` function returns its cleanup ;)
const {run} = useAsyncState(config);
React.useEffect(run);
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

  producer (argv) {}
}, []);
```

This allows us to easily manage asynchronous state while having the ability to share it in all directions of a react app.
The following snippets are all valid use cases of useAsyncState hook:

```javascript
import {useAsyncState} from "react-async-states";

useAsyncState("current-user"); // subscribes or waits for the async state 'current-user' to appear in the provider
useAsyncState(() => fetchStoreData(storeId), [storeId]);// fetches store data whenever the store id changes
useAsyncState(async () => await fetchUserPosts(userId), [userId]);// fetches user posts

useAsyncState();
```
