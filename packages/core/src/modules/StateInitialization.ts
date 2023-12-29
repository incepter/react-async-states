import {
  LastSuccessSavedState,
  ProducerSavedProps,
  StateInterface,
} from "../types";
import { loadCache } from "./StateCache";
import { attemptHydratedState } from "./StateHydration";
import { initial, pending, success } from "../enums";
import { isFunction } from "../utils";
import { now, shallowClone } from "../helpers/core";

export function initializeInstance<TData, A extends unknown[], E>(
  instance: StateInterface<TData, A, E>
) {
  loadCache(instance);

  let maybeHydratedState = attemptHydratedState<TData, A, E>(instance.key);

  if (maybeHydratedState) {
    instance.state = maybeHydratedState.state;
    instance.payload = maybeHydratedState.payload;
    instance.latestRun = maybeHydratedState.latestRun;

    if (instance.state.status === success) {
      instance.lastSuccess = instance.state;
    } else {
      let initializer = instance.config.initialValue;
      let initialData = isFunction(initializer)
        ? initializer(instance.cache)
        : initializer;

      let savedInitialProps = {
        args: [initialData],
        payload: shallowClone(instance.payload),
      } as ProducerSavedProps<TData, A>;
      instance.lastSuccess = {
        status: initial,
        data: initialData,
        timestamp: now(),
        props: savedInitialProps,
      };

      if (maybeHydratedState.state.status === pending) {
        instance.promise = new Promise(() => {});
      }
    }
  } else {
    let initializer = instance.config.initialValue;
    let initialData = isFunction(initializer)
      ? initializer(instance.cache)
      : (initializer as TData);

    let savedInitialProps = {
      args: [initialData],
      payload: shallowClone(instance.payload),
    } as ProducerSavedProps<TData, A>;
    let initialState = {
      status: initial,
      data: initialData,
      timestamp: now(),
      props: savedInitialProps,
    };

    instance.state = initialState;
    instance.lastSuccess = initialState as LastSuccessSavedState<TData, A>;
  }
}
