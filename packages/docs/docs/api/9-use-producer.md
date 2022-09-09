---
sidebar_position: 9
sidebar_label: useProducer
---

# `useProducer`


```typescript
function useProducer<T>(producer: Producer<T>) {

}
```

This hook creates a state instance with the given producer, it returns the same
value as `useAsyncState`, you can see it like this (in reality, useProducer uses
fewer hooks than useAsyncState since it only performs direct subscription
and support only one type of configuration: the producer function) :


```typescript
function useProducer<T>(producer: Producer<T>) {
  return useAsyncState({producer}, [producer]);
}
```
