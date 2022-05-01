---
sidebar_position: 1
sidebar_label: First steps
---

# First steps

This library aims to manage states in general, but its power resides when using
asynchronous ones.

This section should let you get your hands dirty with the library, we will be
using `axios` in our examples.

We will be building an application for users management, but we will go
incrementally, so you can have an overall idea on how the library is flexible
and its way of state management.

In this section you will learn how to deal with the following using the library:
- Manually trigger data fetch
- Trigger data fetching based on dependencies
- Search while typing (+ concurrency & debounce)
- URL based automatic data fetching (via the query string)


## Fetching the users list
### Trigger the fetch on button's click

The following snippet should get you started to the library:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="ts" label="Typescript">

```tsx
import axios from "axios";
import {
  useAsyncState,
  UseAsyncState,
  ProducerProps
} from "react-async-states";

const API = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com"
});

type User = {
  id: number;
  email: string;
  name: string;
};

async function fetchUsers(props: ProducerProps<User[]>): Promise<User[]> {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());

  const usersResponse = await API.get("/users", { signal: controller.signal });
  return usersResponse.data;
}

export default function App() {
  const { state, run }: UseAsyncState<User[]> = useAsyncState(fetchUsers);
  const { status, data } = state;

  return (
    <div className="App">
      <button onClick={() => run()}>Fetch users</button>
      <h3>Status is: {status}</h3>
      {status === "success" && (
        <ul>
          {data.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

</TabItem>
<TabItem value="js" label="JavaScript">

```javascript

```

</TabItem>


</Tabs>

Here is a codesandbox demo with the previous code snippet:

<details open>
<summary>Fetching users list codesandbox demo</summary>

<iframe
style={{width: '100%', height: '500px', border: 0, borderRadius: 4, overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-8i2sib?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
/>

</details>

This example was chosen on purpose so it may be familiar to you if you already
know `react-query` or any other library using the same paradigm.

### Make it automatic on mount

Let's take a close look at how we used the `useAsyncState` hook in the previous
example:

```typescript
const { state, run }: UseAsyncState<User[]> = useAsyncState(fetchUsers);
```

This is equivalent to its base version:

```typescript
const { state, run }: UseAsyncState<User[]> = useAsyncState({
  // highlight-next-line
  producer: fetchUsers,
});
```

The base way to `useAsyncState` hook is the use a configuration object.
If sometimes your use case is basic, the library supported some shortcuts.

To make it run automatically on mount, let's mark it as `lazy: false`:

See it here:
<details>
<summary>Fetching users list automatically on mount codesandbox demo</summary>

<iframe
style={{width: '100%', height: '500px', border: 0, borderRadius: 4, overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-ycq7xf?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
/>

</details>

### React to dependencies with condition

Now, let's fetch the user details when typing his id.

This time, we will be:
- storing the `userId` in a state variable using react's `useState`.
- Pass the userId to our `producer` in the `payload`.
- Only fetch if the userId is `truthy`.
- Fetch everytime the `userId` changes.
- Abort the previous call if a second is done while `pending`.

Here is a full working example:


<Tabs>
<TabItem value="ts" label="Typescript">

```tsx
async function fetchUser(props: ProducerProps<User>): Promise<User> {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());

  const { userId } = props.payload;

  const usersResponse = await API.get("/users/" + userId, {
    signal: controller.signal
  });
  return usersResponse.data;
}

export default function App() {
  const [userId, setUserId] = React.useState("");
  const { state }: UseAsyncState<User> = useAsyncState(
    {
      lazy: false,
      condition: !!userId,
      producer: fetchUser,
      payload: {
        userId
      }
    },
    [userId]
  );
  const { status, data, props } = state;

  return (
    <div className="App">
      <input onChange={(e) => setUserId(e.target.value)} />
      <h3>Status is: {status}</h3>
      {status === "success" && (
        <details open>
          <pre>{JSON.stringify(data, null, 4)}</pre>
        </details>
      )}
      {status === "error" && (
        <div>
          error while retrieving user with id: {props?.payload.userId}
          <pre>{data.toString()}</pre>
        </div>
      )}
    </div>
  );
}

```

</TabItem>
<TabItem value="js" label="JavaScript">

```javascript

```

</TabItem>


</Tabs>

Try it here, notice the cancellation of previous requests, also, you can
remove the abort callback and/or the signal to make concurrency chaos, and make
sure to observe the consistency in the UI.

<details>
<summary>react to dependencies change with condition codesandbox demo</summary>

<iframe
style={{width: '100%', height: '500px', border: 0, borderRadius: 4, overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-qr44ti?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
/>

</details>
