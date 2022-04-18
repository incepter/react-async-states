---
sidebar_position: 5
sidebar_label: useRunAsyncState
---

# `useRunAsyncState`

This hooks returns a `run(keyOrSource, ...args)` function that
runs the given async state by:
- If a source object is provided, runs it.
- If a string is provided, __and inside provider__ will try to run it from the provider.

You can think of it as a dispatch function that works inside and outside the provider.

Signature:

```typescript
import {useRunAsyncState} from "react-async-states";

const run: ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn)
  = useRunAsyncState();
```
