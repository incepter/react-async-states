---
sidebar_position: 8
sidebar_label: useSource
---

# `useSource`


```typescript
function useSource<T>(src: Source<T>, lane?: string) {
  return useAsyncState({srouce: src, lane}, [src, lane]);
}
```

This hook allows simple subscription to a source object, it returns the same
value as `useAsyncState`:


```typescript
function useSource<T>(src: Source<T>, lane?: string) {
  return useAsyncState({source: src}, [src]);
}
```
