---
sidebar_position: 7
sidebar_label: run sources and lanes
---

# Source runners

:::caution

Please note that all these functions were introduced and **should work** only 
at module level or in effects or event handlers, they should never be called
during render.

:::

## `runSource`

This function runs a `source` received as first argument with the rest parameters.
And returns the abort function.

```typescript
import {createSource, runSource} from "react-async-states";

const source = createSource(key, producer, config);

// highlight-next-line
runSource(source, ...args);

// definition
export function runSource<T>(src: AsyncStateSource<T>, ...args): AbortFn {
  // impl
}
```

:::tip
`runSource` after `createSource` will result in the component if rendered
immediately receiving a `pending` status, thus, if used with `read()` and
inside a `Suspense` boundary, will suspend the current tree. If used also
with `lazy` components, will result on fetching data and code in parallel.
:::

## `runSourceLane`

This function runs a [lane](/docs/api/use-async-state#lane) from the `source` 
received as first argument with the rest parameters.
And returns the abort function.

```typescript
import {createSource, runSourceLane} from "react-async-states";

const source = createSource(key, producer, config);

// highlight-next-line
runSourceLane(source, 'lane-id', ...args);

// definition
export function runSourceLane<T>(src: AsyncStateSource<T>, lane: string | undefined, ...args): AbortFn {
  // impl
}
```

## `runpSource`

This function runs the `source` received as first argument with the rest parameters.
And it returns a `Promise<State<T>>` to its resolve.

```typescript
import {createSource, runpSource} from "react-async-states";

const source = createSource(key, producer, config);

// highlight-next-line
runpSource(source, ...args)
  .then(state => {
    
  });

// definition
export function runpSource<T>(src: AsyncStateSource<T>, ...args): Promise<State<T>> {
  return runpSourceLane(src, undefined, ...args);
}
```


## `runpSourceLane`

This function runs a [lane](/docs/api/use-async-state#lane) of the `source` 
received as first argument with the rest parameters.
And it returns a `Promise<State<T>>` to its resolve.

```typescript
import {createSource, runpSourceLane} from "react-async-states";

const source = createSource(key, producer, config);

// highlight-next-line
runpSourceLane(source, laneId, ...args)
  .then(state => {
    
  });

// definition
export function runpSourceLane<T>(src: AsyncStateSource<T>, lane: string | undefined, ...args): Promise<State<T>> {
  // impl
}
```

