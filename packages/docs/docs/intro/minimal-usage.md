---
sidebar_position: 1
sidebar_label: Minimal usage
---

# Minimal usage

The most important API of the library is `useAsyncState` and it has a polymorphic behavior allowing it to support
several writings.

Let's take a look at the signature of the library's APIs.

## useAsyncState

```javascript
// configuration: string | configuration object | producer function | source
function useAsyncState(configuration, dependencies = []) {
  return {
    mode,
    key,
    source,

    state,
    run,
    read,
    lastSuccess,
    payload,

    abort,
    replaceState,
    mergePayload,
  };
}
```
:::caution
In our case, the dependencies array defaults to `empty array` rather than undefined. If you want to trigger a run 
every render, you can to the following:

```javascript
// this snippet will make your producer run every render, if you want.
// the `run` function returns its cleanup
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
  
  subscriptionKey: "some subscription",
  postSubscribe() {},

  hoistToProvider: false,
  hoistToProviderConfig: {override: false},
  fork: false,
  forkConfig: {keepState: true, key: "new-key", keepCache: false},

  runEffect: "debounce",
  runEffectDurationMs: 200,
  
  selector: (currentState, lastSuccess) => currentState,
  areEqual: (prev, next) => prev === next,

  producer (props) {},
  
  cacheConfig: {
    enabled: true,
    getDeadline: s => s.data.headers.maxAge,
    hash: (args, payload) => uniqueFromArgsAndPayload(args, payload),
  }
}, []);
```

This allows us to easily manage [a]synchronous state while having the ability 
to share it in all directions of a react app.

:::tip
The first argument of `useAsyncState` may be a:
- `string`
- `Source` object
- a `Producer` function
- a `configuration object`

The following snippets are all valid use cases of useAsyncState hook:

```javascript
import {useAsyncState} from "react-async-states";

useAsyncState("current-user"); // subscribes or waits for the async state 'current-user' to appear in the provider
useAsyncState(() => fetchStoreData(storeId), [storeId]);// fetches store data whenever the store id changes
useAsyncState(async () => await fetchUserPosts(userId), [userId]);// fetches user posts

useAsyncState(getCurrentUser);
useAsyncState(function* getCurrentUser(props) {
  const user = yield fetchCurrentUser();
  const [permissions, stores] = yield Promise.all([fetchUserPermissions(user.id), fetchUserStores(user.id)]);
  return {user, permissions, stores};
})

useAsyncState({ key: "weather", selector: s => s.data });

useAsyncState();
```
:::

See how I used it here in the [following codesandbox](https://codesandbox.io/s/angry-meitner-lne6o?file=/src/App.js)
to have a prior idea (I will keep updating the same codesandbox on my free time):

<iframe
style={{width: '100%', height: '500px', border: 0, borderRadius: 4, overflow: 'hidden'}}
src="https://codesandbox.io/embed/angry-meitner-lne6o?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
/>


## AsyncStateProvider

The provider allows you to register dynamic states and subscribe to them.
```javascript
// initialStates: array or map of {key, producer, initialValue} or source objects
function AsyncStateProvider({ payload, initialStates, chidlren }) {}
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
<AsyncStateProvider payload={payload} initialStates={staticProducers}>
  {children}
</AsyncStateProvider>
);
````

## useAsyncStateSelector

`useAsyncStateSelector` is responsible for selecting data from one or many
AsyncStates. It can be used like this:

```javascript
// keys: string | source | array of string|source | function returning source | string | array of source|string
function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual) {
  // returns whathever the selector returns (or initialValue)
}

function usePermissions(allowedPermissions) {
  const selector = React.useCallback(state => {
    // this code is not optimized.
    return allowedPermissions.some(t => state.data.permissions.includes(t));
  }, [allowedPermissions]);
  return useAsyncStateSelector("current-user", selector, isEqual);
}

const canSeeWeather = usePermissions(WEATHER_PERMISSIONS);
//...
```
