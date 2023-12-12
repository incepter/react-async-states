---
sidebar_position: 0
sidebar_label: Concepts
---
# Concepts and definitions

The library gives you a piece of state in the memory and gives you full control
over it.

## The state
The library's state value is composed of four properties:

| Property    | Type                                    | Description                                                      |
|-------------|-----------------------------------------|------------------------------------------------------------------|
| `data`      | `T`                                     | The returned data from the `producer function`                   |
| `status`    | `initial,pending,success,error,aborted` | The status of the state                                          |
| `props`     | `ProducerProps`                         | The argument object that the producer was ran with (the `props`) |
| `timestamp` | `number`                                | the time (`Date.now()`) where the state was constructed          |

Using typescript, the state has 4 generic types for now:

````typescript
type State<TData, TError, TReason, TArgs> = {}
````
Where:
- `TData`: Refers to the type of the data when `success`
- `TError`: Refers to the type of the Error when `error`
- `TReason`: Refers to the type of the Abort reason when `aborted`
- `TArgs`: Refers to the type of the `args` that we will use to run our producer.

:::note
- The `data` property has a `null` value when `pending`
- The type of the state goes along with the status:

The following example declares a producer that will perform the login of our user,
while:
- In case of success, the type is `User`
- In case of pending, data is `null`
- In case of error, the type is `Error`
- In case of aborted, the type is `"Timeout"`
- In case of initial, the type is `User | undefined`
```typescript
type User = { username: string, password: string };

function loginProducer(
  props: ProducerProps<User, Error, "Timeout", [string, string]>
): Promise<User> {
  if (!props.args[0]) throw new Error("username is required");
  // let id = setTimeout(() => props.abort("Timeout"), 15000)
  // props.onAbort(() => clearTimeout(id))
  return login({username: props.args[0], password: props.args[0]})
}

let {state, runc} = useAsyncState(producer);
if (state.status === "initial") {
  let data = state.data; // type of data: User | undefined
}
if (state.status === "pending") {
  let data = state.data; // type of data: null
}
if (state.status === "success") {
  let data = state.data; // type of data: User
}
if (state.status === "error") {
  let data = state.data; // type of data: Error
}
if (state.status === Status.aborted) {
  let data = state.data; // type of data: "Timeout"
}

runc({
  onSuccess(state) {
    let {data, status} = state; // <- data type is User, status is success
  },
  onError(state) {
    let {data, status} = state; // <- data type is Error, status is error
  },
  onAborted(state) {
    let {data, status} = state; // <- data type is "Timeout", status is aborted
  },
});
```
:::

## The producer
The producer function is a javascript function, and it is responsible for
returning the state's `data`.

```typescript
// T: data type, E: error type, R: abort reason type, A type of props.args
export type Producer<T, E, R, A extends unknown[]> =
        ((props: ProducerProps<T, E, R, A>) => (T | Promise<T> | Generator<any, T, any>));
```

It may be:
- A regular function returning a `Promise` or `thenable` object.
- A regular function returning a value (reducers, async reducers, mixed...).
- An asynchronous function with `async/await` syntax.
- A `generator` (sagas...).
- `undefined` to replace the state synchronously any time with the desired value.

:::note
1- The library supports synchronous states as well.

If the producer function returns a value besides a `Promise` or a `Generator`,
it is considered synchronous and pass directly to `success` or `error` state.

2- The producer's execution is wrapped inside try catch block, so any thrown
error will be received as state with `error` status:
```javascript
state = {
  data: e,// the catched error
  status: "error",
  props: {}, // the producer's parameter when it was ran
  timestamp: 123,
}
```
:::

## The `source` object

This is a special object obtained from either the library hooks as a named
property, or via `createSource`.

It is a token having all the necessary methods to have full control over
the state with its linked producer.

[Here is a quick](/docs/api/the-whole-api#createsource)
overview of this source object.

### How my app will look like with the library:
In general, here how you will be using the library:

- First you define your producer function (aka: reducer, saga, thunk...)
  and give it its unique name. This function shall
  receive a powerful single argument object called the `props` (or `argv`).
  This function may take any of the supported forms.
- Later, from any point in your app, you can use `useAsyncState(key)`
  or `useSelector(key)` to get the state based on your needs.
