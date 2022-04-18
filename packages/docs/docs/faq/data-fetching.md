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
  const {state: {data, status}}: UseAsyncState<SearchResult> = useAsyncState(searchProducer);

  let isError = status === "error";
  let isSuccess = status === "success";
  let isPending = status === "intial" || status === "pending";
  
  // return and hack your UI
}
```

## If you want to share that state
### If you want to have the data at provider level
#### If you want to initially hoist it at provider

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

