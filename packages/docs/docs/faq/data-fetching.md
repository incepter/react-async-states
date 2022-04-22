---
sidebar_position: 1
sidebar_label: Data fetching
---

# Data fetching
# How to fetch data using the library:
The library offers plenty of ways to fetch data:

Let's say you are designing a search page where the user fills a form to search
and a list of data:

## If you only need that data once in a component

In this case, you only need to use the `useAsyncState(producer)` signature.
This is the most basic usage, but if you need later to change the behavior and
may be share the state, the library got you and there isn't a use case I can
think of that it is supported.


```typescript
import {UseAsyncState, useAsyncState, ProducerProps} from "react-async-states";

type SearchResult = {}

function searchProducer(props: ProducerProps<SearchResult>) {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());
  const {signal} = controller;
  const [params] = props.args;
  return fetch(url, {params, signal}).then(readResult);
}

function MyComponent() {
  const {run, state: {data, status}}: UseAsyncState<SearchResult> = useAsyncState(searchProducer);

  let isError = status === "error";
  let isSuccess = status === "success";
  let isPending = status === "intial" || status === "pending";
  
  // return and hack your UI
  
  // somewhere in your app, either in an effect or an event handler:
  run(...args);
}
```

## If you want to share that state
### If you want to have the data at provider level
#### If you want to initially hoist it at provider

Then you need to wrap your tree in an `AsyncStateProvider` with the needed
props.
`initialStates` corresponds to the states initially available in the provider,
but you can change them on runtime easily, either by changing the value of this
prop (the provider will take care of reconciliation) or hoist new ones from children.

```jsx
import {createSource, AsyncStateProvider} from "react-async-states";


// Somewhere app in the tree
const initialState = {
  myList: {
    key: "my-list",
    producer: searchProducer,
  },
};
// or
const initialState = {
  myList: createSource(
    "my-list",
    searchProducer,
  ),
};
// or
const initialState = [
  createSource(
    "my-list",
    searchProducer,
  ),
];
<AsyncStateProvider initialStates={initialStates}>
  {children}
</AsyncStateProvider>
```

#### If you want to hoist it dynamically to provider

```typescript
import {UseAsyncState, useAsyncState, ProducerProps} from "react-async-states";

type SearchResult = {}
function searchProducer(props: ProducerProps<SearchResult>) {
  // ...
}

function MyComponent() {
  const {state: {data, status}}: UseAsyncState<SearchResult> = useAsyncState({
    producer: searchProducer,
    hoistToProvider: true,
    hoistToProviderConfig: {override: false},
  });
  // return and hack your UI
}
```

The above snippet makes a state accessible in the provider dynamically
on demand (that's called hoisting in the library.).


### If you want to have the data at module level

```typescript
import {UseAsyncState, useAsyncState, ProducerProps, createSource} from "react-async-states";

type SearchResult = {}

function searchProducer(props: ProducerProps<SearchResult>) {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());
  const {signal} = controller;
  const [params] = props.args;
  return fetch(url, {params, signal}).then(readResult);
}

const searchSource = createSource("search-result", searchProducer);

function MyComponent() {
  const {state: {data, status}}: UseAsyncState<SearchResult> = useAsyncState(searchSource);

  let isError = status === "error";
  let isSuccess = status === "success";
  let isPending = status === "intial" || status === "pending";
  
  // return and hack your UI
}

// and from anywhere in the app you can controle this source

```

