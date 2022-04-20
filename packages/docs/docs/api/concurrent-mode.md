---
sidebar_position: 6
sidebar_label: React 18+
---

# `React 18+`

React's concurrent features and components suspension is 
supported by the library actually just in `useAsyncState` hook: It returns a 
`read` function that suspends the component if it detects that the current 
used React version is 18 or above, technically, it tests whether the `React`'s
package exports a `useSyncExternalStore` function to decide if the current
react version supports concurrent mode.

To suspend a component when it is pending, you can do the following:

```javascript
function MyComponent() {
  const {read} = useAsyncState(config, deps);
  
  // later, in this component or another:
  const selectedStateValue = read();
}
```

This can be useful if you want to pass the read function to a child component
to suspend only itself.
