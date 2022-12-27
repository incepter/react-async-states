---
sidebar_position: 99
sidebar_label: React 18+
---

# `React 18+`


## Components suspension

React's concurrent features and components suspension is 
supported by the library actually in `useAsyncState` or other hooks: It returns a 
`read` function:

```typescript
read(suspend?: boolean = true, throwError?: boolean = true);
```
This function enable the react's concurrent feature: `Component suspension` and
`Error boundary`.

So calling read requires you to have a `Suspense` and/or `ErrorBoundary`
up in your tree.

You can pass this function to a child component that will read the data and
suspend if pending.

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
The library performs an optimistic lock, so everytime a subscribed component
renders, it will check the current version in the instance, if different, it
will schedule an update.

## Transitions
If your producer isn't used with a `runEffect`, then the transition to the
`pending` state is scheduled immediately in a sync way. So you may benefit
from `useTransition` and `startTransition` APIs.
