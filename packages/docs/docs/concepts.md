---
sidebar_position: 0
sidebar_label: Concepts
---
# Concepts and definitions

The library gives you a piece of state in the memory and allows you to have
full control over it from all over your application.

In this section, we will see the major concepts that are used.
Mainly, there are three that you should be aware of:

- The state: How the library stores it internally
- The producer: The function that gives the state succeeded data
- The source object: How to interact and and manipulate the state from anywhere

## The state
The library's state value is composed of four properties, and has three
typescript generic parameters:

```tsx
type State<TData, TArgs extends unknown[] = [], TError = Error> = { ... }
```
Where:
- `TData`: Refers to the type of the data when `success`
- `TArgs`: Refers to the type of the `args` that we will use to run the function
- `TError`: Refers to the type of the Error when `error`

And here are the properties composing the `state`:

| Property    | Type                                  | Description                                              |
|-------------|---------------------------------------|----------------------------------------------------------|
| `data`      | `T`                                   | The returned data from your function                     |
| `status`    | `initial`,`pending`,`success`,`error` | The current status of the state, that goes with the data |
| `props`     | `ProducerProps`                       | The `args` and `payload` that led to this state          |
| `timestamp` | `number`                              | the time (`Date.now()`) where the state was constructed  |

## The producer
The producer is the function associated to our state that will be responsible
for giving us the succeeded data. It is optional, but you will provide it most
of the time, especially for all async flows.


Straight from the codebase, here is the definition of a producer:

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

The producer's props is an object containing many information such as:
- `args`: The arguments that it was ran with
- `signal`: an Abort signal used to pass directly to fetch or axios to easily
  support cancellations.
- `onAbort`: Allows you to register abort callbacks
- `getState`: In case of living producers, such as the ones that connect
  to websockets or so, this comes handy to append to the previous state etc.

And other properties that we will see later.

:::note
The producer's execution is wrapped inside try catch block, so any thrown
error will be received as `state` with `error` status:
```tsx
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

This object has many methods, some of them are:
- `run(...args)` allows you to run your producer
- `getState()` gives you the current state
- `setState(value, status?)` allows you to set the state to any value
- `subscribe(cb)` allows you to manually subscribe to this state. You won't
  use this API much.
- `runc({ args, onSuccess, onError })` allows you to trigger a run with
  callbacks to that specific run. I call them: per-run-callbacks. They remove
  the issue that you may had with other libraries when you define some callbacks
  in the used hook, then use many instances of that component, resulting in 
  the callbacks triggering several times.

And so many other properties.
