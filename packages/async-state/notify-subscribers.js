import { invokeIfPresent } from "shared";

export function notifySubscribers(promiseState) {
  Object.values(promiseState.subscriptions).forEach(t => {
    invokeIfPresent(t.callback, promiseState.currentState);
  });
}

export function clearSubscribers(promiseState) {
  Object.values(promiseState.subscriptions).forEach(t => {
    invokeIfPresent(t.cleanup);
  });
}
