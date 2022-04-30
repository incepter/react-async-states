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

Here is a codesandbox demo about it:

<details open>
<summary>Fetching users list codesandbox demo</summary>

<iframe
style={{width: '100%', height: '500px', border: 0, borderRadius: 4, overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-8i2sib?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
/>

</details>

This may be familiar to you if you already know `react-query`.

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
<summary>Fetching users list automatically on mount  codesandbox demo</summary>

<iframe
style={{width: '100%', height: '500px', border: 0, borderRadius: 4, overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-ycq7xf?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
/>

</details>



