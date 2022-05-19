---
sidebar_position: 6
sidebar_label: runSource
---

# `runSource`

This function runs a `source` received as first argument with the rest parameters.

```typescript
import {createSource, runSource} from "react-async-states";

const source = createSource(key, producer, config);

// hightlight-next-line
runSource(source);
```

:::caution

Please note that this function was introduced and **should work** only at module
level or in effects or event handlers, this function should not be called during
render.

:::

:::tip
`runSource` after `createSource` will result in the component if rendered
immediately receiving a `pending` status, thus, if used with `read()` and
inside a `Suspense` boundary, will suspend the current tree. If used also
with `lazy` components, will result on fetching data and code in parallel.
:::
