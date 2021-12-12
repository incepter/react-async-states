---
sidebar_position: 1
sidebar_label: The producer function
---
# The producer function

The producer function is the function that returns the state value, it may be:

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
