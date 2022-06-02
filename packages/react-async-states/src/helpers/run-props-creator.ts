import {
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface
} from "../types.internal";
import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus, Producer,
  ProducerProps,
  ProducerPropsRunConfig,
  ProducerPropsRunInput,
  RunExtraProps,
  State
} from "../async-state";
import {invokeIfPresent, isFn, shallowClone} from "../../../shared";
import {nextKey} from "../hooks/utils/key-gen";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {isAsyncStateSource} from "../async-state/utils";

function createRunFunction<T>(
  manager: AsyncStateManagerInterface | null,
  props: ProducerProps<T>
) {
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

      if (config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
    } else if (isFn(input)) {
      asyncState = new AsyncState(nextKey(), input as Producer<T>);
      if (config?.payload) {
        asyncState.payload = shallowClone(Object.create(null), config.payload);
      }
    } else if (manager !== null) {
      asyncState = manager?.get(input as AsyncStateKey);

      if (config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
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

      if (config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
    } else if (isFn(input)) {
      asyncState = new AsyncState(nextKey(), input as Producer<T>, {});
      if (config?.payload) {
        asyncState.payload = shallowClone(Object.create(null), config.payload);
      }
    } else {
      asyncState = manager?.get(input as AsyncStateKey);

      if (config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
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
    input: AsyncStateKeyOrSource<T>,
    lane?: string,
  ): State<T> | undefined {
    let asyncState: AsyncStateInterface<T>;

    if (isAsyncStateSource(input)) {
      asyncState = readAsyncStateFromSource(input as AsyncStateSource<T>);
      if (lane) {
        asyncState = asyncState.getLane(lane);
      }
      return asyncState.currentState;
    }

    let managerAsyncState = manager?.get(input as AsyncStateKey);
    if (!managerAsyncState) {
      return undefined;
    }
    if (lane) {
      asyncState = (managerAsyncState as AsyncStateInterface<T>).getLane(lane);
    } else {
      asyncState = managerAsyncState  as AsyncStateInterface<T>;
    }

    return asyncState.currentState;
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
