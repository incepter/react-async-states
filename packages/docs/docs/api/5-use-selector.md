---
sidebar_position: 5
sidebar_label: useSelector
---

# `useSelector`
Now that we know how to define and share asynchronous states (or states in general), what about selecting values
from multiple states at once, and derive its data. Let's get back to `useSelector` signature:

```javascript
// keys: (string or source or array of either) (or function)
function useSelector(keys, selector = identity, areEqual = shallowEqual) {
  // returns whathever the selector returns
}
// where
function shallowEqual(prev, next) {
  return prev === next;
}
function identity(...args) {
  if (!args || !args.length) {
    return undefined;
  }
  return args.length === 1 ? args[0] : args;
}
```

Let's explore the arguments one by one and see what we can with them:

- `keys`: the keys you need to derive state from, can be either a string of a async state, and array of keys
  or a function that will receive the keys (should return a string or an array of strings).
- `selector`: will receive as many parameters (the state values) as the count of resulting keys.
- `areEqual`: This function receives the previous and current selected value, then re-renders only if the previous and current value are not equal.

Notes:
- The selector subscribes to all desired async states, and runs whenever they notify it by recalculating the selected value.
- If one async state isn't found, its state value is `undefined`.
- If not found, the selector waits for a state with the given key.

Examples: __todo__ add selectors examples.
