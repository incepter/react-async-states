---
sidebar_position: 2
sidebar_label: Cancellations
---

# How do cancellations work ?

You can register an abort callback when your producers runs.

```typescript
function producer(props) {
  props.onAbort(reason => myCancellCallback(reason));
}
```

The abort callbacks are executed on one of the following:
- The component changes dependencies (or unmounts) while was running.
- The abort function is invoked.
- A new run while running.
- When a new run occurs and there are registered abort callbacks (such from promises using the emit API).

## How to abort a fetch request ?

Assuming you are a fetch API-like:

```typescript
function producer(props) {
  const controller = new AbortController();
  props.onAbort(reason => controller.abort(reason));
  
  return fetch(url, {signal, ...somethingElse}).then(readResponse);
}
```

:::tip
You can think of a `fetchProducerWrapper` that wraps your producer while adding a signal:
```typescript

function fetchProducerWrapper(producer) {
  return function wrapperProducer(props) {
    const controller = new AbortController();
    props.onAbort(reason => controller.abort(reason));
    // don't touch the props object (for now)
    return producer(props, {signal});
  }
}

// and then, the previous example becomes:
// note that you can customize the signature and maybe add other information
function producer(props, {signal}) {
  return fetch(url, {signal, ...somethingElse}).then(readResponse);
}
```
:::

## How to abort an interval ?

Here is how to cancel an interval producer that `setInterval` and then `props.emit`:
```typescript
function producer(props) {
  const intervalId = setInterval(() => {
    props.emit((oldState) => {
      const newState = doSomethingWith(oldState.data);
      return newState;
    })
  }, delay);
  props.onAbort(() => clearInterval(intervalId));
  return whatheverYouNeed;
}

```

