---
sidebar_position: 7
sidebar_label: React 18+
---

# `React 18+`


## Components suspension

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

## Tearing
The library doesn't include `useRef` at all, and schedules a render everytime
the state changes, so it is immune to all tearing problems.

Just don't make it tear with own custom selectors.

## Transitions
If your producer isn't used with a `runEffect`, then the transition to the
`pending` state is scheduled immediately in a sync way. So you may benefit
from `useTransition` ans `startTransition` APIs.
