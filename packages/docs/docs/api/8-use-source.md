---
sidebar_position: 8
sidebar_label: useSource
---

# `useSource`


```typescript
function useSource<T>(src: AsyncStateSource<T>) {

}
```

This hook allows simple subscription to a source object, it returns the same
value as `useAsyncState`, you can see it like this (in reality, useSource uses
fewer hooks than useAsyncState since it only performs direct subscription
and support only one type of configuration: the source objects) :


```typescript
function useSource<T>(src: AsyncStateSource<T>) {
  return useAsyncState({source: src}, [src]);
}
```

## `useSourceLane`


```typescript
function useSourceLane<T>(src: AsyncStateSource<T>, lane?: string) {

}
```
This hook is similar to `useSource`, but the subscription is performed to the lane.

You can see it like this, but it uses also fewer hooks:


```typescript
function useSourceLane<T>(source: AsyncStateSource<T>, lane?: string) {
  return useAsyncState({source, lane}, [src, lane]);
}
```


:::note
These two hooks are related like this:

```typescript
function useSource(src) {
  return useSourceLane(src, undefined);
}

```
:::
