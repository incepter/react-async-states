---
sidebar_position: 2
sidebar_label: Minimal usage
---

# Minimal usage

Let's first take a look at the signature of the library's APIs.

## useAsyncState

```javascript
// configuration: string | object | function | source
function useAsyncState(configuration, dependencies = []) {
  return {
    mode,
    key,
    source,

    state,
    run,
    lastSuccess,
    payload,

    abort,
    replaceState,
    mergePayload,

    runAsyncState,
  };
}
```
:::caution
In our case, the dependencies array defaults to `empty array` rather than undefined. If you want to trigger a run 
every render, you can to the following:

```javascript
// this snippet will make your producer run every render, if you want.
// the `run` function returns its cleanup ;)
const {run} = useAsyncState(config);
React.useEffect(run);
```
:::


Now, let's see what is the configuration object that `useAsyncState` accepts:

```javascript
const value = useAsyncState({
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

This allows us to easily manage [a]synchronous state while having the ability to share it in all directions of a react app.

:::tip
The first argument of `useAsyncState` may be a:
- string
- source object
- a producer function
- an object of configuration

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
:::

## AsyncStateProvider

The provider allows you to register dynamic states and subscribe to them.
```javascript
// initialAsyncStates: array or map of {key, producer, initialValue} or source objects
function AsyncStateProvider({ payload, initialAsyncStates, chidlren }) {}
```

Some usages of the provider:

````javascript
const location = useLocation();
const payload = React.useMemo(function getPayload() {
return {
  queryString: parseSearch(location.search)
};
}, [location]);

return (
<AsyncStateProvider payload={payload} initialAsyncStates={staticProducers}>
  {children}
</AsyncStateProvider>
);
````



## useAsyncStateSelector

```javascript
// keys: string | source | array of string|source | function returning source | string | array of source|string
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  // returns whathever the selector returns (or initialValue)
}

function usePermissions(allowedPermissions) {
  const selector = React.useCallback(state => {
    // this code is not optimized.
    return allowedPermissions.some(t => state.data.permissions.includes(t));
  }, [allowedPermissions]);
  return useAsyncStateSelector("current-user", selector, isEqual, false);
}

const canSeeWeather = usePermissions(WEATHER_PERMISSIONS);
//...
```