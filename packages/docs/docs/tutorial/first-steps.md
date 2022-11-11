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

The following examples are using `useAsyncState` hook.

You can think of its signature like

```typescript
function useAsyncState(config, dependencies = []) {
  ...
}
```

## Fetching the users list

### Trigger the fetch on button's click

The following snippet should get you started to the library:

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

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

  const usersResponse = await API.get("/users", {signal: controller.signal});
  return usersResponse.data;
}

export default function App() {
  const {state, run}: UseAsyncState<User[]> = useAsyncState(fetchUsers);
  const {status, data} = state;

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

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-8i2sib?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

This example was chosen on purpose so it may be familiar to you if you already
know `react-query` or any other library using the same paradigm.

### Make it automatic on mount

Let's take a close look at how we used the `useAsyncState` hook in the previous
example:

```typescript
const {state, run}: UseAsyncState<User[]> = useAsyncState(fetchUsers);
```

This is equivalent to its base version:

```typescript
const {state, run}: UseAsyncState<User[]> = useAsyncState({
  // highlight-next-line
  producer: fetchUsers,
});
```

The base way to `useAsyncState` hook is the use a configuration object. If
sometimes your use case is basic, the library supported some shortcuts.

To make it run automatically on mount, let's mark it as `lazy: false`:

See it here:
<details>
<summary>Fetching users list automatically on mount codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-ycq7xf?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>


## Fetching the user details
### React to dependencies with condition

Now, let's fetch the user details when typing his id.

This time, we will be:

- Storing the `userId` in a state variable using react's `useState`.
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

  const {userId} = props.payload;

  const usersResponse = await API.get("/users/" + userId, {
    signal: controller.signal
  });
  return usersResponse.data;
}

export default function App() {
  const [userId, setUserId] = React.useState("");
  const {state}: UseAsyncState<User> = useAsyncState(
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
  const {status, data, props} = state;

  return (
    <div className="App">
      <input onChange={(e) => setUserId(e.target.value)}/>
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

Try it here, notice the cancellation of previous requests, also, you can remove
the abort callback and/or the signal to make concurrency chaos, and make sure to
observe the consistency in the UI.

<details>
<summary>react to dependencies change with condition codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-qr44ti?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

### Debounce search while typing

If we look at the previous example, we run a fetch request whenever the user
types something (and we ignore empty string).

Now, let's debounce the run by `400ms`:

That's all we need to do it:

```tsx
// ...
export default function App() {
  const [userId, setUserId] = React.useState("");
  const {state}: UseAsyncState<User> = useAsyncState(
    {
      lazy: false,
      condition: !!userId,
      producer: fetchUser,
      // highlight-next-line
      runEffect: "debounce",
      // highlight-next-line
      runEffectDurationMs: 400,
      payload: {
        userId
      }
    },
    [userId]
  );
  // ...
}

```

Try it here:

<details>
<summary>debounce the run codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-r2qd8q?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

:::tip
The `run` function supports passing parameters to the `producer`, received as `args`.

Let's edit the previous example and get rid of the state variable:

```tsx

async function fetchUser(props: ProducerProps<User>): Promise<User> {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());

  // highlight-next-line
  const [userId] = props.args;

  const usersResponse = await API.get("/users/" + userId, {
    signal: controller.signal
  });
  return usersResponse.data;
}

export default function App() {
  const { run, state }: UseAsyncState<User> = useAsyncState({
    lazy: true,
    producer: fetchUser,
    runEffect: "debounce",
    runEffectDurationMs: 400
  });
  const { status, data, props } = state;

  return (
    <div className="App">
      <input onChange={(e) => run(e.target.value)} />
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

See it here:

<details>
<summary>run with userId codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-dz0knu?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>


Notice that we removed the state variable and also the payload and the dependency
array.

The library's default dependencies are an empty array.
:::

:::note
If you take a close look at how we used `useAsyncState` in the previous example,
you'd see that our producer does not depend from any closure related to
the component render:
it can safely be moved to module level.
```typescript
const searchUserConfig = {
  lazy: true,
  producer: fetchUser,
  runEffect: "debounce",
  runEffectDurationMs: 400
};

export default function App() {
  const {run, state}: UseAsyncState<User> = useAsyncState(searchUserConfig);
  const {status, data, props} = state;
  // the rest
}
```
:::

### React to URL change

Now, rather than writing the user id and reacting to a state variable, let's
grab the `userId` from the url and navigate when the typed value changes.

```typescript
// highlit-next-line
const {userId} = useParams();
const {state}: UseAsyncState<User> = useAsyncState(
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
const {status, data, props} = state;


// AND

const navigate = useNavigate();

function onChange(e) {
  const id = e.target.value;
  if (id) {
    navigate(`/users/${id}`);
  }
}
<input onChange={onChange} />;

```

See it in action here:


<details>
<summary>Read userId from the URL codesandbox demo</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-w9v2ss?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>



### Skip the pending state if request is so fast

To skip the pending state, the `skipPendingDelayMs` is used.

It means that when state turns to pending, and then changes under that delay,
the pending update shall be skipped.

```typescript
// highlit-next-line
const {userId} = useParams();
const {state}: UseAsyncState<User> = useAsyncState(
  {
    lazy: false,
    condition: !!userId,
    producer: fetchUser,
    skipPendingDelayMs: 400,
    payload: {
      userId
    }
  },
  [userId]
);
const {status, data, props} = state;


// AND

const navigate = useNavigate();

function onChange(e) {
  const id = e.target.value;
  if (id) {
    navigate(`/users/${id}`);
  }
}
<input onChange={onChange} />;

```

See it in action here, and notice that when having a good internet connexion
that the experience feels instantaneous.


<details>
<summary>Skip the pending state</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-dphucp?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>


