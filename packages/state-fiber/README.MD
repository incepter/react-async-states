# state fiber

## Usage example

```tsx
const { data, error, isPending } = useFiber({
	args: [userId],
	key: "user-details",
	producer: getUserDetails,
});
```

```tsx
// source has everything: run, setData, setError, setState...
const [data, source] = useData({
	args: [userId],
	key: "user-details",
	producer: getUserDetails,
});
```

```tsx
const { data, source } = useAsync({
	args: [userId],
	key: "user-details",
	producer: getUserDetails,
});
```

## Contribution

### Lib explanations and tradeoffs

The library stores the state in a data structure called StateFiber, you can
refer to the `IStateFiber` interface to see the attributes.

The most important properties are:

- `root: StateRoot`: contains the state name, configuration and function
- `version: number`: this is incremented each time the state changes
- `actions: FiberActions`: actions to manipulate the state
- `task: RunTask`: the latest finished task
- `pending: RunTask`: the currently pending run
- `state: State`: the current state (`initial`, `success` or `error`)

A task represents a run, means it is created the moment you call `run`,
it references anything related to than run and to be able to replicate it:

- `args`: the run args
- `payload`: a shallow clone of the StateFiber's payload when ran
- `indicators`: contains whether the run has been aborted etc..
- `callbacks`: onSuccess and onError callbacks to be executed when setting state
- `controller`: the AbortController linked to that run
- `result`: the immediate result after calling `run`, may be `T` or `Promise<T>`
- `promise`: A promise object that the library and react understand
