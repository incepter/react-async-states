---
sidebar_position: 2
sidebar_label: State sharing
---

# State sharing

The library offers two ways to share a state:

- via `AsyncStateProvider`.
- via `source` objects.

## Using `source` objects

a `source` object is returned from `createSource` or obtained
from `useAsyncState`, the library understands this objects and allows performing
subscription to the state it links to.

```typescript
import {createSource} from "react-async-states";


const currentUserSource = createSource("current-user", fetchCurrentUser, config);

```

This state is then accessible from all over your application, you can simply use
to access it:

```typescript
import {useAsyncState} from "react-async-states";

const {state, source} = useAsyncState(currentUserSource);

// Like mentionned above, useAsyncState returns a source property
// in the case above source === currentUserSource.
```

Let's make a simple `counter` source:

```tsx
import {
  UseAsyncState,
  useAsyncState,
  createSource,
  ProducerProps
} from "react-async-states";
import * as React from "react";
import { render } from "react-dom";

function counterProducer({ lastSuccess, args: [salt] }: ProducerProps<number>) {
  return (lastSuccess.data ?? 0) + Number(salt || 1);
}

const counterSource = createSource("counter", counterProducer, {
  initialValue: 0
});

function Counter() {
  const {
    state: { data },
    run
  }: UseAsyncState<number> = useAsyncState(counterSource);

  return (
    <section>
      <button onClick={() => run(-1)}>Decrement</button>
      <span>{data}</span>
      <button onClick={() => run(1)}>Increment</button>
    </section>
  );
}

const rootElement = document.getElementById("root");

render(
  <React.StrictMode>
    <Counter />
    <Counter />
  </React.StrictMode>,
  rootElement
);

```

<details>
<summary>Shared counter source</summary>

<iframe style={{width: '100%', height: '500px', border: 0, borderRadius: 4,
overflow: 'hidden'}}
src="https://codesandbox.io/embed/react-typescript-forked-ooo3e9?fontsize=14&hidenavigation=1&theme=dark"
allow="accelerometer; ambient-light-sensor; camera; encrypted-media;
geolocation; gyroscope; hid; microphone; midi; payment; usb; vr;
xr-spatial-tracking"
sandbox="allow-forms allow-modals allow-popups allow-presentation
allow-same-origin allow-scripts"
/>

</details>

This is a basic example of how to share state using source.

:::note
since `createSource` does not depend on react to work, it will also work
with different react trees and state will be reflected in both of them.
:::
