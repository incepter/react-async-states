```javascript
/**
 * what you should provide:
 * an array of objects with this shape:
 *
 * {
 *   key: must be unique, better use symbols,
 *   promise: could be a function, a promise or a generator (generators are recommended)
 *   config: the promise config, define whether it is lazy, forkable...etc
 * }
 *
 * the promise will be executed fiven the following object:
 * {
 *   renderCtx: anything passed from the render via usePromiseState
 *   providerCtx: anything that the provider received from props (can be: {dispatch, store} from redux ;))
 *   cancelled: whether the trigger of the promise state unmounted or cleaned it
 *   executionArgs: if not lazy and execution is manual, it may provide some args
 *   lastState: the last resolved state (may be success or error)
 * }
 *
 *
 * promiseStates will be used using a hook: usePromiseState, that represents a subscription to a promiseState
 * function usePromiseState(key, config, promiseConfig) {}
 *
 *
 * key: the unique identifier of the promise state, if will be used to subscribe to the global promise states in the provider
 * config: the subscription config, has this shape:
 *          {
 *            fork: defines whether to fork from parent promise state (very, very important)
 *            forkConfig: { keepState, keepSubscriptions }
 *            rerenderStatus: { loading, success, error } defines when to trigger a re-render
 *            onResolve (state): callback when a subscription is resolved
 *          }
 * promiseConfig: this parameter will allow the usePromiseState to work on standalone mode
 *                it will allow to passe the promise config at this level and choose whether to hoist it, share it ...
 *                it has the following shape:
 *                {
 *                  hoistToProvider: boolean (if true, other subscriptions may subscribe to it)
 *                  promise: could be a function, a promise or a generator (generators are recommended)
 *                  config: the promise config, define whether it is lazy, forkable...etc
 *                  overrideExisting: boolean that defines whether whether to override any promise with same key in the provider (hoistToProvider should be true)
 *                  overrideConfig: { keepState, keepSubscriptions }
 *                }
 *
 * The previous API will be bound to routing easily:
 *
 * - Provider mode
 * - Based on route match, provider promise states are decided
 * - providerCtx will contain the match param providing easy access to route match and location or any other related data
 *
 *
 */

let PS_TRANSACTIONS_KEY = Symbol("transactions-promise-state");

function getTransactions(...args) {
  return new Promise((res, rej) => {
    setTimeout(() => {
      if (Math.random() < 0.5) {
        rej("toto");
      }
      console.log("get transactions with args", args);
      return res([{ id: 1, description: "toto" }]);
    }, 2000);
  });
}

let transactionsPromiseDefinition = Object.freeze({
  key: PS_TRANSACTIONS_KEY,
  promise: function*({
    cancelled,
    lastState: { status, data } = {},
    renderCtx: { storeCode, onSuccess, onFail },
    providerCtx: {
      route: { query, match },
    },
  }) {
    try {
      const result = yield getTransactions(storeCode, query);
      if (!cancelled) {
        onSuccess(result);
      }
      yield result;
      console.log("retrieved successfully the list of transactions", result);
    } catch (e) {
      onFail(e);
      console.log("cannot retrived list of transactions", e);
      yield Promise.reject(e);
    }
  },
});
```
