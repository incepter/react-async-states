> Utilities on top of `react-async-states`

# React async states utils

Utilities for react-async-states.

[Docs link](https://incepter.github.io/react-async-states/docs/utils/intro)

## State Boundary

### What is this ?

[Docs link](https://incepter.github.io/react-async-states/docs/utils/state-boundary)

State boundary is a component that allows performing all render strategies in react:

1. Render Then Fetch: Render the initial component, then fetch its data
2. Fetch As You Render: fetch data while rendering and suspend when pending and
   throw when error.
3. Fetch Then Render: renders nothing until it fetches data, suppressing
   the pending state.

## `StateBoundaryProps`

This component accepts the following props:

| Property       | Type                              | Default Value     | Description                                                                                         |
|----------------|-----------------------------------|-------------------|-----------------------------------------------------------------------------------------------------|
| `config`       | `MixedConfig<T, E, R, S>`         | `undefined`       | The same supported configuration as the `useAsyncState` hook                                        |
| `dependencies` | `any[]`                           | `[]`              | The dependencies that will be passed to `useAsyncState` hook                                        |
| `strategy`     | `RenderStrategy`                  | `RenderThenFetch` | The applied strategy                                                                                |
| `render`       | `Record<Status, React.ReactNode>` | `undefined`       | A record containing the component to render for each status                                         |
| `children`     | `React.ReactNode`                 | `null`            | children are considered as a fallback whenever the `render` property doesn't have the actual status |


Where the `RenderStrategy` enum is defined as follows:
```ts

export enum RenderStrategy {
FetchAsYouRender = 0,
FetchThenRender = 1,
RenderThenFetch = 2,
}

```

### `useCurrentState()`

This hook returns the current state in the boundary

### `useBoundary(sourceKey?: string)`

When Multiple `StateBoundary` are nested, this hook allows you to take any
state up in the tree by its `key`.

This hook then calls `useSource` on the result obtained from the `config` given
to that state boundary.


## `addBooleanStatus`

This selector can be passed to `useAsyncState`, and will add the following
properties to the existing state:

isInitial, isPending, isError, isAborted, isSuccess.

These properties are intuitive and well typed along with the equivalent status:

```typescript
  type User = { username: string, password: string };

  function producer(props: ProducerProps<User, Error, "Timeout">): Promise<User> {
    if (!props.args[0]) throw new Error("username or password is incorrect");
    return Promise.resolve({username: 'admin', password: 'admin'});
  }

  let {state, runc} = useAsyncState({producer, selector: defaultSelector});

  if (state.isPending) {
    let {data} = state; // type of data: null
  }
  if (state.isError) {
    let {data} = state; // type of data: Error
  }
  if (state.isAborted) {
    let {data} = state; // type of data: "Timeout"
  }

  if (state.status === Status.initial) {
    let data = state.data; // ts type of data <- User | undefined
    let {isError, isSuccess} = state;
    if (isSuccess) { // <- type of isSuccess is false
      console.log("impossible")
    }
    if (isError) {  // <- type of isError is false
      console.log('impossible')
    }
  }
  if (state.status === Status.pending) {
    let data = state.data; // ts type of data <- null
  }
  if (state.status === Status.success) {
    let data = state.data; // ts type of data <- User
  }
  if (state.status === Status.error) {
    let data = state.data; // ts type of data <- Error
  }
  if (state.status === Status.aborted) {
    let data = state.data; // ts type of data <- "Timeout"
  }
```
