import { EMPTY_OBJECT, invokeIfPresent } from "../utils";

export function notifySubscribers(promiseState) {
  Object.values(promiseState.subscriptions ?? EMPTY_OBJECT).forEach(t => {
    invokeIfPresent(t.callback, promiseState);
  });
}
