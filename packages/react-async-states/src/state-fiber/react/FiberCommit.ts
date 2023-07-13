import {IFiberSubscription} from "./_types";
import {onFiberStateChange} from "./FiberSubscription";

export function commitSubscription<T, A extends unknown[], R, P, S>(
  subscription: IFiberSubscription<T, A, R, P, S>
) {
  let { fiber, alternate } = subscription;

  // if alternate is falsy, this means this subscription is ran again
  // without the component rendering (StrictEffects, Offscreen .. )
  // todo: verify subscription is painting latest version
  // todo: when subscription "was suspending", it should notify other components
  //       because they may be in a pending state waiting for react to render
  //       back from suspense
  if (alternate) {
    // merge all alternate properties inside the subscription
    Object.assign(subscription, alternate);

    alternate = null;
    subscription.alternate = null;
  }

  subscription.callback = () => onFiberStateChange(subscription);
  let unsubscribe = fiber.actions.subscribe(subscription.update, subscription);

  return () => {
    unsubscribe();
  };
}
