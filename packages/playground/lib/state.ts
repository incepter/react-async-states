import { State, StateInterface } from "async-states";

export const setInstanceStateAndNotifySubscribers = <
  TData,
  TArgs extends unknown[],
  TError,
>(
  instance: StateInterface<TData, TArgs, TError>,
  newState: State<TData, TArgs, TError>,
) => {
  instance.actions.abort();
  instance.currentAbort = undefined;

  instance.state = newState;
  instance.pendingUpdate = null;
  instance.version += 1;

  if (!instance.subscriptions) {
    return;
  }

  Object.values(instance.subscriptions).forEach((subscription) => {
    subscription.props.cb(instance.state);
  });
};
