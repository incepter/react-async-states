---
sidebar_position: 1
sidebar_label: First steps
---

# First steps

In this section you will learn how to deal with the following using the library:

- Manually trigger data fetching
- Trigger data fetching based on dependencies
- Search while typing (+ concurrency & debounce)
- URL based automatic data fetching (via the query string)

The following examples are using the `useAsync` hook.

Its signature is like this:

```tsx
function useAsync(options, dependencies = []) {
  // ...
}
```

## Fetching the users list

### Trigger the fetch on button's click

The following snippet should get you started to the library:

```tsx
import axios from "axios";
import { useAsync, ProducerProps } from "react-async-states";

const API = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
});

type User = {
  id: number;
  email: string;
  name: string;
};

async function fetchUsers({ signal }: ProducerProps<User[]>) {
  // artificially delayed by 500ms
  await new Promise((res) => setTimeout(res, 500));
  return await API.get("/users", { signal }).then(({ data }) => data);
}

export default function App() {
  const { data, isPending, source } = useAsync(fetchUsers);

  return (
    <div className="App">
      <button disabled={isPending} onClick={() => source.run()}>
        Fetch users {isPending && "..."}
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
```

Here is a codesandbox demo with the previous code snippet:

<details open>
<summary>Fetching users list codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/s84vjc?view=Editor+%2B+Preview&module=%2Fsrc%2FApp.tsx"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

### Make it automatic on mount

There are two ways to achieve this:

- use the `useAsync` hook with a configuration object while passing the
  `producer: fetchUsers` and `lazy: false` properties.
- use the `useAsync.auto(fetchUsers)` hook which adds the `lazy: false` for you.

We used useAsync as follows in the previous example:

```typescript
const result = useAsync(fetchUsers);

// this is the same as:
const result = useAsync({
  producer: fetchUsers,
});
```

To make it automatic on component mount:

```typescript
const result = useAsync({
  // highlight-next-line
  lazy: false,
  // highlight-next-line
  producer: fetchUsers,
});

// this is the same as:
// highlight-next-line
const result = useAsync.auto(fetchUsers);

```

See it here using the `useAsync.auto` variant:
<details>
<summary>Fetching users list automatically on mount codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/v72ddx?view=Editor+%2B+Preview&module=%2Fsrc%2FApp.tsx"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

:::tip
Notice how nothing used by the `useAsync` hook depend on the component render.

A simple:
```tsx
useAsync.auto(producer);
```
:::

## Fetching the user details

Now, let's try to use variables from the component render phase.

First, let's make it ugly by storing a `React.State` variable then pass it
to `useAsync`. Then, let's eliminate the used state variable.

### React to dependencies with condition

Now, let's fetch the user details when typing his id.

This time, we will be:

- Storing the `userId` in a state variable using React `useState` hook.
- Pass the userId to our `producer` in the `args` for proper typing.
- Only fetch if the userId is not empty and not `0`.
- Fetch everytime the `userId` changes.
- Abort the previous call if a second is done while `pending`.

Here is a full working example:

```tsx

async function fetchUserDetails({
  signal,
  args: [userId],
}: ProducerProps<User, [string]>) {
  // artificially delayed by 500ms
  await new Promise((res) => setTimeout(res, 500));
  return await API.get(`/users/${userId}`, { signal }).then(({ data }) => data);
}

export default function App() {
  const [userId, setUserId] = useState("");
  const { data, isPending, error } = useAsync.auto(
    {
      condition: !!userId,
      autoRunArgs: [userId],
      producer: fetchUserDetails,
    },
    [userId]
  );

  return (
    <div className="App">
      <input placeholder="userId" onChange={(e) => setUserId(e.target.value)} />
      {isPending && "Loading..."}
      {data && (
        <details open>
          <pre>{JSON.stringify(data, null, 4)}</pre>
        </details>
      )}
      {error && (
        <div>
          error while retrieving user details
          <pre>{error.toString()}</pre>
        </div>
      )}
    </div>
  );
}
```

Try it here, notice the cancellation of previous requests, also, you can remove
the abort callback and/or the signal to make concurrency chaos, and make sure to
observe the consistency in the UI.

<details>
<summary>react to dependencies change with condition codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/cjmlnw?view=Editor+%2B+Preview&module=%2Fsrc%2FApp.tsx"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

### Eliminate the previous state variable

Let's now use the `run` function from the `source` to fully eliminate any
component render variable or additional state:

```tsx

async function fetchUserDetails({
  signal,
  args: [userId],
}: ProducerProps<User, [string]>) {
  if (!userId) {
    throw new Error("User Id is required");
  }
  return await API.get(`/users/${userId}`, { signal }).then(({ data }) => data);
}

export default function App() {
  const { data, isPending, isSuccess, isError, error, source } =
    useAsync(fetchUserDetails);

  return (
    <div className="App">
      <input
        placeholder="userId"
        onChange={(e) => source.run(e.target.value)}
      />
      {isPending && "Loading..."}
      {isSuccess && (
        <details open>
          <pre>{JSON.stringify(data, null, 4)}</pre>
        </details>
      )}
      {isError && (
        <div>
          error while retrieving user details
          <pre>{error.toString()}</pre>
        </div>
      )}
    </div>
  );
}
```


<details>
<summary>Load user details as you type</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/cjmlnw?view=Editor+%2B+Preview&module=%2Fsrc%2FApp.tsx"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

### Debounce search while typing

- We will slow down all requests by 500ms
- We will debounce by 400ms, so fetch will occur only after we hang on typing
- We will use the `state` property from the `useAsync` result to show extra
  information.

:::note
In `useAsync` result:
- `state` refers to the current state.
- `data` refers to the last success data.
- `state.data` is `data` when `state.status` is `success`.
:::

```tsx
// ...
function App() {
  const { state, source } = useAsync({
    key: "user-details",
    producer: fetchUserDetails,
    // pass this args to the producer

    // apply this effect to runs
    // highlight-next-line
    runEffect: "debounce",
    // this is the effect duration
    // highlight-next-line
    runEffectDurationMs: 400,
  });

  return (
    <div className="App">
      <input
        placeholder="userId"
        onChange={(e) => source.run(e.target.value)}
      />
      {state.status === "pending" &&
        "Loading user with Id: " + state.props.args![0]}
      {state.status === "success" && (
        <details open>
          <pre>{JSON.stringify(state.data, null, 4)}</pre>
        </details>
      )}
      {state.status === "error" && (
        <div>
          error while retrieving user details
          <pre>{state.data.toString()}</pre>
        </div>
      )}
    </div>
  );
}


```

Try it here:

<details>
<summary>debounce the run codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/xtfvjx?view=Editor+%2B+Preview&module=%2Fsrc%2FApp.tsx"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

:::note
If you take a close look at how we used `useState` in the previous example,
you'd see that our producer does not depend from any closure related to
the component render:
it can safely be moved to module level.
```typescript
const searchUserConfig = {
  producer: fetchUser,
  runEffect: "debounce",
  runEffectDurationMs: 400
};

export default function App() {
  const { source, state } = useState(searchUserConfig);
  // ... the rest
}
```
:::

### Skip the pending state if request is so fast

To skip the pending state, the `skipPendingDelayMs` is used.

It means that when state turns to pending, and then changes under that delay,
the pending update shall be skipped.

This makes your app feels synchronous.

```tsx
const { state, source } = useAsync({
  key: "user-details",
  producer: fetchUserDetails,
  // pass this args to the producer
  
  // apply this effect to runs
  runEffect: "debounce",
  // this is the effect duration
  runEffectDurationMs: 400,
  
  // skip the pending status when the request is too fast
  // highlight-next-line
  skipPendingDelayMs: 300,
});

```

See it in action here, and notice that when having a good internet connexion
that the experience feels instantaneous.


<details>
<summary>Skip the pending state</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/qywx53?view=Editor+%2B+Preview&module=%2Fsrc%2FApp.tsx"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>


