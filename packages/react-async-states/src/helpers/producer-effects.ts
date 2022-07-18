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
  ProducerEffects,
  State
} from "../async-state";
import {invokeIfPresent, isFn, shallowClone} from "../../../shared";
import {nextKey} from "../hooks/key-gen";
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
    const producerEffectsCreator =
      manager?.producerEffectsCreator || standaloneProducerEffectsCreator;

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
      asyncState = manager.get(input as AsyncStateKey);

      if (asyncState && config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
    } else {
      return undefined;
    }

    if (!asyncState) {
      return undefined;
    }

    return asyncState.run(producerEffectsCreator, ...args);
  }
}

function createRunPFunction(manager, props) {
  return function runp<T>(
    input: ProducerPropsRunInput<T>,
    config: ProducerPropsRunConfig | null,
    ...args: any[]
  ): Promise<State<T>> | undefined {
    let asyncState: AsyncStateInterface<T>;
    const producerEffectsCreator =
      manager?.producerEffectsCreator || standaloneProducerEffectsCreator;

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
      let unsubscribe = asyncState.subscribe(subscription);
      props.onAbort(unsubscribe);

      let abort = asyncState.run(producerEffectsCreator, ...args);
      props.onAbort(abort);

      function subscription(newState: State<T>) {
        if (newState.status === AsyncStateStatus.success
          || newState.status === AsyncStateStatus.error) {
          invokeIfPresent(unsubscribe);
          resolve(newState);
        }
      }
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

export function createProducerEffectsCreator(manager: AsyncStateManagerInterface) {
  return function closeOverProps<T>(props: ProducerProps<T>): ProducerEffects {
    return {
      run: createRunFunction(manager, props),
      runp: createRunPFunction(manager, props),
      select: createSelectFunction(manager),
    };
  }
}

export function standaloneProducerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects {
  return {
    run: createRunFunction(null, props),
    runp: createRunPFunction(null, props),
    select: createSelectFunction(null),
  };
}
