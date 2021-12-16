---
sidebar_position: 5
sidebar_label: Concurrent mode (React 18+)
---

# `Concurrent mode`

React's concurrent mode and components suspension is supported by the library actually just in `useAsyncState` hook.

In fact, it returns a `read` function that suspends the component if it detects that the current used react version is 18 or above,
technically, it tests whether the `React`'s package exports a `useSyncExternalStore` function to decide if the current
react version supports concurrent mode.

To suspend a component when it is pending, you can do the following:

```javascript
function MyComponent() {
  const {read} = useAsyncState(config, deps);
  
  // later, in this component or another:
  const selectedStateValue = read();
}
```
