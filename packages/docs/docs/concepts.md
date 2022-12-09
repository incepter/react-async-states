---
sidebar_position: 0
sidebar_label: Concepts
---
# Concepts and definitions

The library a piece of state in the memory and gives you full control
over it.

## The state
The library's state value is composed of four properties:

| Property    | Type                                    | Description                                                      |
|-------------|-----------------------------------------|------------------------------------------------------------------|
| `data`      | `T`                                     | The returned data from the `producer function`                   |
| `status`    | `initial,pending,success,error,aborted` | The status of the state                                          |
| `props`     | `ProducerProps`                         | The argument object that the producer was ran with (the `props`) |
| `timestamp` | `number`                                | the time (`Date.now()`) where the state was constructed          |

## The producer
The producer function is a javascript function, and it is responsible for
returning the state's `data`.

```typescript
export type Producer<T> =
  ((props: ProducerProps<T>) => (T | Promise<T> | Generator<any, T, any>));
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
- Second (optional), you define a provider that will host your states and payload.
- Later, from any point in your app, you can use `useAsyncState(key)`
  or `useSelector(key)` to get the state based on your needs.

After mounting your app, it will more likely appear like this:

![img](/img/provider-app.png)
