---
sidebar_position: 2
sidebar_label: State sharing
---

# State sharing

## Definition by key

By default, any state you create by the library is shared and will be accessible
from your whole application without tuning or configuration.

State instances are defined by their `key`, it is its unique name. So as long
as you provide the same key, the same state is used all over your application
for the default behavior.

Having this said, the following just works

> It just works!

```tsx
import { useAsync } from "react-async-states";

function ComponentA() {
  let { state, source: { setState } } = useAsync("tracker");

  return (
    <div>
      <span>State Value is: {state.data}</span>
      <button onClick={() => setState("A")}>set A</button>
    </div>
  );
}

function ComponentB() {
  let { state, source: { setState } } = useAsync("tracker");

  return (
    <div>
      <span>State Value is: {state.data}</span>
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

Test [it here](https://codesandbox.io/p/sandbox/bold-bash-iflftb?file=%2Fsrc%2FApp.js%3A7%2C24)

## Creating sources

There is another effective way to define your states and make them accessible
from the whole application: The `Source`.

The source object is reference to your state that allows you to manipulate it
and have control over it from anywhere.

```tsx
const source = createSource("state-name", producer, configuration);
```

It is so powerful in the sense that you can create module level sources and
export them, `useAsync` and all the hooks provided by the library understand
this object for faster subscription into your components.

For example, we can create and export the source and the utilities function
that will operate on it. Let's take the classic counter example:

```tsx
import { createSource } from "react-async-states";

export const counter = createSource("counter", null, { initialValue: 0 });

export function reset() { ... }
export function increment() { ... }
export function decrement() { ... }
```

The same applies for all types of producers and all configs.
