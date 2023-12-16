---
sidebar_position: 2
sidebar_label: useData
---
# `useData`

## The `useData` hook
This hook allows subscription and full control over a state, and represents 
the API that you will be using with the most.

:::tip
`useData` uses the same signature as `useAsync` documented in [its section.](/docs/hooks/use-async-state)

This means that it accepts the same parameters and returns the same shape.

Please refer to [`useAsync` documentation.](/docs/hooks/use-async-state)
:::


Its signature is:

```typescript
function useData<TData, TArgs, TError, TSelection = State<TData, TArgs, TError>>(
  config: MixedConfig<TData, TArgs, TError, TSelection>,
  deps: any[] = []
): UseDataResult<TData, TArgs, TError> {
  // [Not Native Code]
}

// used like this:
const result = useData(config, deps);
```

## Differences from `useAsync`

The major difference is that `useData` will never return a `pending` or `error`
states.

- `useData` will suspend if the status is `pending`
- `useData` will throw the error if status is `error`

This means that `useData` assumes you are:
- Using a React `Error Boundary` to display errors if applied.
- Using `Suspense` to display pending states (with or without `Transition`).
- Or, you are working with a total synchronous state that's not supposed to error.

:::warning
If you work with suspense, it is important to give a `key` to your states.

Because if the tree suspends, React will reset everything and will result
in creating a new state everytime, and thus, an infinite loop.
:::

## Example
### Async
```tsx
async function fetchUsers({ signal }: ProducerProps<User[]>) {
  // artificially delayed by 500ms
  await new Promise((res) => setTimeout(res, 1000));
  return await API.get("/users", { signal }).then(({ data }) => data);
}

function Details() {
  const { data, source } = useData({
    lazy: false,
    key: "user-details",
    producer: fetchUsers,
  });

  return (
    <div className="App">
      <button onClick={() => source.run()}>
        Fetch users
      </button>
      {data && (
        <ul>
          <summary>Users list:</summary>
          {data.map((user: User) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  return (
    <Suspense fallback="Suspense fallback ... pending">
      <Details />
    </Suspense>
  );
}
```

### Counter

```tsx
export default function App() {
  const {
    data,
    source: { setData },
  } = useData({
    initialValue: 0,
  });

  return (
    <div>
      <button onClick={() => setData((prev) => prev! - 1)}>Decrement</button>
      <span>{data}</span>
      <button onClick={() => setData((prev) => prev! + 1)}>Increment</button>
    </div>
  );
}
```
