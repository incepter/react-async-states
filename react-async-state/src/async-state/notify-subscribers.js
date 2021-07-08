import { invokeIfPresent } from "../utils";

export function notifySubscribers(promiseState) {
  Object.values(promiseState.subscriptions).forEach(t => {
    invokeIfPresent(t.callback, promiseState.currentState);
  });
}
