---
sidebar_position: 5
sidebar_label: useRunAsyncState
---

# `useRunAsyncState`

This hook works only in provider, and serves to run any async state by key.

Signature:

```typescript
useRunAsyncState: (keyOrSource: AsyncStateKeyOrSource<T>,...args: any[]) => AbortFn
```

As you may guess, it takes a source object or a key and runs the resulting async
state with the given args.
