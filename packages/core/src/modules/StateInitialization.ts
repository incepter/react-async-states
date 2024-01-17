import {
  LastSuccessSavedState,
  ProducerSavedProps,
  StateInterface,
  PromiseLike,
} from "../types";
import { loadCache } from "./StateCache";
import { attemptHydratedState } from "./StateHydration";
import { initial, pending, success } from "../enums";
import { isFunction } from "../utils";
import { now, shallowClone } from "../helpers/core";

export function initializeInstance<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  loadCache(instance);

  let maybeHydratedState = attemptHydratedState<TData, TArgs, TError>(
    instance.key,
    instance.config
  );

  if (maybeHydratedState) {
    let [state, latestRun, payload] = maybeHydratedState;
    instance.state = state;
    instance.payload = payload;
    instance.latestRun = latestRun;

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
      } as ProducerSavedProps<TData, TArgs>;
      instance.lastSuccess = {
        status: initial,
        data: initialData,
        timestamp: now(),
        props: savedInitialProps,
      };

      if (state.status === pending) {
        let promise: Promise<TData> = new Promise(() => {});
        (promise as PromiseLike<TData, TError>).status = pending;
        instance.promise = promise as PromiseLike<TData, TError>;
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
    } as ProducerSavedProps<TData, TArgs>;
    let initialState = {
      status: initial,
      data: initialData,
      timestamp: now(),
      props: savedInitialProps,
    };

    instance.state = initialState;
    instance.lastSuccess = initialState as LastSuccessSavedState<TData, TArgs>;
  }
}
