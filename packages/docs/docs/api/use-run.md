---
sidebar_position: 5
sidebar_label: useRun
---

# `useRun`

This hooks returns a `run(keyOrSource, ...args)` function that
runs the given async state by:
- If a source object is provided, runs it.
- If a string is provided, __and inside provider__ will try to run it from the provider.

You can think of it as a dispatch function that works inside and outside the provider.

Signature:

```typescript
import {useRun} from "react-async-states";

const run: ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn)
  = useRun();
```

:::caution

Please note that the returned function **should work** only in effects or
event handlers, this function should not be called during render.

:::