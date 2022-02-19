import {
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface
} from "../types.internal";
import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus,
  ProducerProps,
  ProducerPropsRunConfig,
  ProducerPropsRunInput,
  RunExtraProps,
  State
} from "../../../async-state";
import {isAsyncStateSource} from "../../../async-state/AsyncState";
import {readAsyncStateFromSource} from "../../../async-state/utils";
import {invokeIfPresent, shallowClone} from "../../../shared";
import {nextKey} from "../hooks/utils/key-gen";

function createRunFunction<T>(
  manager: AsyncStateManagerInterface | null, props: ProducerProps<T>) {
  return function run<T>(
    input: ProducerPropsRunInput<T>,
    config: ProducerPropsRunConfig | null,
    ...args: any[]
  ): AbortFn {
    let asyncState: AsyncStateInterface<T> | undefined;
    const runExtraPropsCreator =
      manager?.runExtraPropsCreator || standaloneRunExtraPropsCreator;

    if (isAsyncStateSource(input)) {
      asyncState = readAsyncStateFromSource(input as AsyncStateSource<T>);
    } else if (typeof input === "function") {
      asyncState = new AsyncState(nextKey(), input, {});
      if (config?.payload) {
        asyncState.payload = shallowClone(Object.create(null), config.payload);
      }
    } else if (manager !== null) {
      asyncState = manager?.get(input as AsyncStateKey);
    } else {
      asyncState = undefined;
    }

    if (!asyncState) {
      return undefined;
    }

    return asyncState.run(runExtraPropsCreator, ...args);
  }
}

function createRunPFunction(manager, props) {
  return function runp<T>(
    input: ProducerPropsRunInput<T>,
    config: ProducerPropsRunConfig | null,
    ...args: any[]
  ): Promise<State<T>> | undefined {
    let asyncState: AsyncStateInterface<T>;
    const runExtraPropsCreator =
      manager?.runExtraPropsCreator || standaloneRunExtraPropsCreator;

    if (isAsyncStateSource(input)) {
      asyncState = readAsyncStateFromSource(input as AsyncStateSource<T>);
    } else if (typeof input === "function") {
      asyncState = new AsyncState(nextKey(), input, {});
      if (config?.payload) {
        asyncState.payload = shallowClone(Object.create(null), config.payload);
      }
    } else {
      asyncState = manager?.get(input as AsyncStateKey);
    }

    if (!asyncState) {
      return undefined;
    }

    return new Promise(resolve => {
      function subscription(newState: State<T>) {
        if (newState.status === AsyncStateStatus.success
          || newState.status === AsyncStateStatus.error) {
          invokeIfPresent(unsubscribe);
          resolve(newState);
        }
      }

      let unsubscribe = asyncState.subscribe(subscription);
      props.onAbort(unsubscribe);

      let abort = asyncState.run(runExtraPropsCreator, ...args);
      props.onAbort(abort);
    });
  }
}

function createSelectFunction<T>(manager: AsyncStateManagerInterface | null) {
  return function select(
    input: AsyncStateKeyOrSource<T>
  ): State<T> | undefined {
    if (isAsyncStateSource(input)) {
      return readAsyncStateFromSource(input as AsyncStateSource<T>)
        .currentState;
    }
    return manager?.get(input as AsyncStateKey)?.currentState;
  }
}

export function createRunExtraPropsCreator(manager: AsyncStateManagerInterface) {
  return function closeOverProps<T>(props: ProducerProps<T>): RunExtraProps {
    return {
      run: createRunFunction(manager, props),
      runp: createRunPFunction(manager, props),
      select: createSelectFunction(manager),
    };
  }
}

export function standaloneRunExtraPropsCreator<T>(props: ProducerProps<T>): RunExtraProps {
  return {
    run: createRunFunction(null, props),
    runp: createRunPFunction(null, props),
    select: createSelectFunction(null),
  };
}
