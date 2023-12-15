---
sidebar_position: 1
sidebar_label: The producer
---
# The producer

## What is a producer function?
The producer function is the function that returns the state's value,
here is its declaration:

```typescript
export type Producer<TData, TArgs extends unknown[] = [], TError = Error> = (
	props: ProducerProps<TData, TArgs, TError>
) => TData | Promise<TData> | Generator<any, TData, any>;
```

It may be:
- Any synchronous function returning a value
- Any async function: using the `async/await` syntax, or returning a `promise`
- A `generator`, either synchronous or asynchronous.
- Not defined. Yes, you can have no producer at all. In this case, you will be
  using `setState` to set the state directly and immediately.

The main goal and purpose is to `run` your function,
so it will receive a single object argument with the following properties:

| Property      | Description                                                                                                                                        |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `args`        | The arguments passed to `run`, `runp` or `runc`                                                                                                    |
| `signal`      | An abort signal to be used for cancellations with common APIs such as fetch and axios                                                              |
| `payload`     | A copy of the internal payload held by this state instance                                                                                         |
| `lastSuccess` | The last succeeded state                                                                                                                           |
| `isAborted`   | A function returns a boolean indicating whether the current run has been cancelled (by dependency change, unmount or user action)                  |
| `abort`       | Abort the current run, if the run did not return a promise yet, no changes will be applied to the state                                            |
| `onAbort`     | Allows to register an abort callback that will be called on cleanup, or when another run occurs                                                    |
| `emit`        | set the state from the producer after it resolves, this to support intervals and incoming events from an external system (like websockets, sse...) |
| `getState`    | gets the current state. May be useful with emit                                                                                                    |


Your function will be notified with the cancellation by registering an `onAbort`
callback, you can exploit to clear a timeout or interval for example.

The `isAborted` function that returns a boolean that is truthy if 
this current run is aborted, you may want to use it before calling a callback
received from payload or args.

The following functions are all supported by the library:

You can even omit the producer function, if you attempt to run it,
it will simply call `setState` and imperatively change the current state with
either the value or the updater that it received.

## The producer props

Please keep in ming the producer type declaration and the generics that it has:

-`TData`: Refers to the type of the data when `success`
- `TArgs`: Refers to the type of the `args` that we will use to run the function
- `TError`: Refers to the type of the Error when `error`

```typescript
export type Producer<TData, TArgs extends unknown[] = [], TError = Error> = (
	props: ProducerProps<TData, TArgs, TError>
) => TData
```

### `args`
#### Type and description
These are the arguments that the `run` functions receives, of type: `TArgs`
which is a subset of an array.

#### Usage examples
```tsx
// a counter example
function counter(props: ProducerProps<number, ["increment" | "decrement", number]>) {
  const [action, by] = args;
  if (action === "increment") {
    ...
  } else if (action === "decrement") {
    
  }
}

function searchUsers(
  { args: [query] }: ProducerProps<Page<User>, [string], Error>
) {
  return fetchUsersList(`${url}?${query}`);
}
```

### `signal`
#### Type and description
This is [an `AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
#### Usage examples

```tsx
function searchUsers(
  { args: [query] }: ProducerProps<Page<User>, [string], Error>
) {
  return fetchUsersList(`${url}?${query}`);
}

async function getUserDetails(
  { args: [userId], signal }: ProducerProps<User, [string], Error>
) {
  return API.get(`/users/${userId}`, { signal });
}
```

### `lastSuccess`
#### Type and description
This is either an `InitialState` or a `SuccessState`.

When ran for the first time, this will hold the initial state with the given
`initialValue` when defining your state, or else, it will always be the latest
success state.

#### Usage examples

```tsx
async function infiniteProductsPageExample(
  { lastSuccess, args: [page, query] }: ProducerProps<Page<Product>, [number, string]
) {
  let previousPage = lastSuccess.props?.args[0] ?? 0;
  let nextPage = previousPage + 1;
  
  let nextPageData = await fetchProductsInPage(page, query);
  let previousProducts = lastSuccess.data ?? [];
  
  return mergeData(previousProducts, nextPageData);
} 

```

### `isAborted`
#### Type and description
This is a function that returns `true` if the current run has been aborted.

Let's say you have a promise chain in your producer, since there is no way to
tell when a promise has been invalidated, the `isAborted` comes into play.

PS: You can use the `signal.aborted` too when it is fully supported by modern
environments.
#### Usage examples

```tsx
function producer({ isAborted }) {
  getAPromise()
    .then(res => {
      if (!isAborted()) {
        // do work only if it wasn't aborted for some of your reasons
        // for example, only display a toast if there was no cancellation
      }
    })
    .catch(err => {
      if (!isAborted()) {
        // do work only if it wasn't aborted for some of your reasons
        // for example, only display a toast if there was no cancellation
      }
    })
}

```


### `abort`
#### Type and description
This is equivalent to `signal.abort()`, in fact, it will call `signal.abort`
internally too.
This is a function that doesn't return anything.
#### Usage examples
```tsx
function getUserDetails({ abort, args: [userId] }) {
  if (!userId) {
    abort();
  }
}
```

The previous example won't result in any state update and will just bailout the
run without affecting anything.
### `onAbort`
#### Type and description
This lets you register abort callbacks that will be executed when an abort event
occurs.
#### Usage examples
```tsx
async function producer({ onAbort }) {
  let id;
  onAbort(() => clearTimeout(id));
  await new Promise(res => {
    id = setTimeout(someWork, delay);
  });
}
```

### `emit`
#### Type and description
This has the same signature as `setState`, but will have no effect before
the producer returns or after the abort occurs.

Think of it like something that keeps the producer alive after it returns.

It is an optimization that will allow you to support producers with intervals
or that subscribes to external message sources, such as websockets or server
side events.

#### Usage examples

```tsx
function intervalProducer({ onAbort, emit, args: [initialValue] }) {
  let id = setInterval(() => {
    emit(prev => prev.data + 1)
  });
  onAbort(() => clearInterval(id));
  return initialValue;
}
function messagesProducer({ onAbort, emit, args: [initialValue] }) {
  let client = connectToWs();
  client.on("close", () => {
    emit(null, "initial");
  });
  client.on("error", (err) => {
    emit(err, "error");
  });
  client.on("message", (msg) => {
    emit(prev => [...prev.data, msg]; 
  });
  onAbort(() => client.disconnect());
  return [];
}
```

### `getState`
#### Type and description
Returns the current state. It is mostly handy in combination with `emit`.
