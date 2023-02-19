---
sidebar_position: 2
sidebar_label: State sharing
---

# State sharing

Any state you create by the library is shared and will be accessible from
your whole application without tuning or configuration.

Only one single instance is created in memory for a given key, if you attempt
to recreate it, its producer and configuration will change only. It won't get created

You can simply do [something like this](https://codesandbox.io/s/bold-bash-iflftb?file=/src/App.js):

> It just works!

```tsx
import { useAsyncState } from "react-async-states";

function ComponentA() {
  let { state, setState } = useAsyncState("tracker");

  return (
    <div>
      <span>Last updater is {state.data}</span>
      <button onClick={() => setState("A")}>set A</button>
    </div>
  );
}

function ComponentB() {
  let { state, setState } = useAsyncState("tracker");

  return (
    <div>
      <span>Last updater is {state.data}</span>
      <button onClick={() => setState("B")}>set B</button>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ComponentA />
      <hr />
      <ComponentB />
    </>
  );
}
```
