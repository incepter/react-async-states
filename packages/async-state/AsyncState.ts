import {__DEV__, cloneProducerProps, invokeIfPresent, numberOrZero, shallowClone} from "shared";
import {wrapProducerFunction} from "./wrap-producer-function";
import {AsyncStateStateBuilder, constructAsyncStateSource, warnDevAboutAsyncStateKey} from "./utils";
import devtools from "devtools";
import {enableRunEffects} from "shared/featureFlags";
import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKeyType,
  AsyncStateSource,
  AsyncStateStateFunctionUpdater,
  AsyncStateStateType,
  AsyncStateStatus,
  AsyncStateSubscription,
  ForkConfigType,
  Producer,
  ProducerConfig,
  ProducerFunction,
  ProducerProps,
  ProducerRunEffects
} from "./types";

export default class AsyncState<T> implements AsyncStateInterface<T> {
  //region properties
  key: AsyncStateKeyType;
  _source: AsyncStateSource;
  uniqueId: number | undefined;

  currentState: AsyncStateStateType<T>;
  lastSuccess: AsyncStateStateType<T>;

  config: ProducerConfig<T>;
  private locks: number = 0;
  private forkCount: number = 0;
  payload: Object | null = null;
  private pendingTimeout: { id: ReturnType<typeof setTimeout>, startDate: number } | null = null;

  private subscriptionsMeter: number = 0;
  subscriptions: { [id: number]: AsyncStateSubscription<T> } = {};

  producer: ProducerFunction<T>;
  suspender: Promise<T> | undefined = undefined;
  readonly originalProducer: Producer<T>;
  private currentAborter: AbortFn = undefined;

  //endregion

  constructor(key: AsyncStateKeyType, producer: Producer<T>, config: ProducerConfig<T>) {
    warnDevAboutAsyncStateKey(key);

    this.key = key;
    this.config = shallowClone(config);
    this.originalProducer = producer;

    const initialValue = typeof this.config.initialValue === "function" ? this.config.initialValue() : this.config.initialValue;
    this.currentState = AsyncStateStateBuilder.initial(initialValue);
    this.lastSuccess = this.currentState;

    this.producer = wrapProducerFunction(this);

    if (__DEV__) {
      this.uniqueId = nextUniqueId();
    }

    this._source = makeSource(this);

    Object.preventExtensions(this);

    if (__DEV__) devtools.emitCreation(this);
  }

  setState(newState: AsyncStateStateType<T>, notify: boolean = true): void {
    if (__DEV__) devtools.startUpdate(this);

    this.currentState = newState;

    if (this.currentState.status === AsyncStateStatus.success) {
      this.lastSuccess = this.currentState;
    }

    if (this.currentState.status !== AsyncStateStatus.pending) {
      this.suspender = undefined;
      this.currentAborter = undefined;
    }
    if (__DEV__) devtools.emitUpdate(this);

    if (notify) {
      notifySubscribers(this as AsyncStateInterface<any>);
    }
  }

  abort(reason: any = undefined) {
    invokeIfPresent(this.currentAborter, reason);
  }

  dispose() {
    if (this.locks > 0) {
      return false;
    }

    this.abort();
    clearSubscribers(this as AsyncStateInterface<T>);

    this.locks = 0;
    const initialValue = typeof this.config.initialValue === "function" ? this.config.initialValue() : this.config.initialValue;
    this.setState(AsyncStateStateBuilder.initial(initialValue));
    if (__DEV__) devtools.emitDispose(this);

    return true;
  }

  run(...args: any[]) {
    const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

    if (!enableRunEffects || !this.config.runEffect || effectDurationMs === 0) {
      return this.runImmediately(...args);
    } else {
      return this.runWithEffect(...args);
    }
  }

  private runWithEffect(...args: any[]): AbortFn {
    const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

    const that = this;
    if (enableRunEffects && this.config.runEffect) {
      const now = Date.now();

      // @ts-ignore
      function registerTimeout() {
        let runAbortCallback: AbortFn | null = null;

        const timeoutId = setTimeout(function realRun() {
          that.pendingTimeout = null;
          runAbortCallback = that.runImmediately(...args);
        }, effectDurationMs);

        that.pendingTimeout = {
          id: timeoutId,
          startDate: now,
        };

        return function abortCleanup(reason) {
          clearTimeout(timeoutId);
          that.pendingTimeout = null;
          invokeIfPresent(runAbortCallback, reason);
        }
      }


      switch (this.config.runEffect) {
        case ProducerRunEffects.delay:
        case ProducerRunEffects.debounce:
        case ProducerRunEffects.takeLast:
        case ProducerRunEffects.takeLatest: {
          if (this.pendingTimeout) {
            const deadline = this.pendingTimeout.startDate + effectDurationMs;
            if (now < deadline) {
              clearTimeout(this.pendingTimeout.id);
            }
          }
          return registerTimeout();
        }
        case ProducerRunEffects.throttle:
        case ProducerRunEffects.takeFirst:
        case ProducerRunEffects.takeLeading: {
          if (this.pendingTimeout) {
            const deadline = this.pendingTimeout.startDate + effectDurationMs;
            if (now <= deadline) {
              return function noop() {
                // this functions does nothing
              };
            }
            break;
          } else {
            return registerTimeout();
          }
        }
      }
    }
    return this.runImmediately(...args);
  }

  private runImmediately(...execArgs: any[]): AbortFn {
    if (this.currentState.status === AsyncStateStatus.pending) {
      this.abort();
      this.currentAborter = undefined;
    }

    const that = this;

    let onAbortCallbacks: AbortFn[] = [];

    const props: ProducerProps<T> = {
      abort,
      args: execArgs,
      aborted: false,
      lastSuccess: that.lastSuccess,
      payload: shallowClone(that.payload),
      onAbort(cb: AbortFn) {
        if (typeof cb === "function") {
          onAbortCallbacks.push(cb);
        }
      }
    };

    function abort(reason: any): AbortFn | undefined {
      if (props.aborted || props.fulfilled) {
        // already aborted or fulfilled in this closure!!!
        return;
      }
      props.aborted = true;
      that.setState(AsyncStateStateBuilder.aborted(reason, cloneProducerProps(props)));
      onAbortCallbacks.forEach(function clean(func) {
        invokeIfPresent(func, reason);
      });
      that.currentAborter = undefined;
    }

    this.currentAborter = abort;
    this.producer(props);
    return abort;
  }

  subscribe(cb, subKey?: string | undefined) {
    let that = this;
    this.subscriptionsMeter += 1;
    // @ts-ignore
    let subscriptionKey: string = subKey;

    if (subKey === undefined) {
      subscriptionKey = `${this.key}-sub-${this.subscriptionsMeter}`;
    }

    function cleanup() {
      that.locks -= 1;
      delete that.subscriptions[subscriptionKey];
      if (__DEV__) devtools.emitUnsubscription(that, subscriptionKey);
    }

    this.subscriptions[subscriptionKey] = {
      cleanup,
      callback: cb,
      key: subscriptionKey,
    };
    this.locks += 1;

    if (__DEV__) devtools.emitSubscription(this, subscriptionKey);
    return cleanup;
  }

  fork(forkConfig: { keepState: boolean, key: AsyncStateKeyType }) {
    const mergedConfig: ForkConfigType = shallowClone(defaultForkConfig, forkConfig);

    let {key} = mergedConfig;

    if (key === undefined) {
      key = `${this.key}-fork-${this.forkCount + 1}`;
    }

    const clone = new AsyncState(key, this.originalProducer, this.config);

    // if something fail, no need to increment
    this.forkCount += 1;

    if (mergedConfig.keepState) {
      clone.currentState = shallowClone(this.currentState);
      clone.lastSuccess = shallowClone(this.lastSuccess);
    }

    return clone as AsyncStateInterface<T>;
  }

  replaceState(newValue: T | AsyncStateStateFunctionUpdater<T>): void {
    if (this.currentState.status === AsyncStateStatus.pending) {
      this.abort();
      this.currentAborter = undefined;
    }

    let effectiveValue = newValue;
    if (typeof newValue === "function") {
      effectiveValue = (newValue as AsyncStateStateFunctionUpdater<T>)(this.currentState);
    }

    if (__DEV__) devtools.emitReplaceState(this);
    const savedProps = cloneProducerProps({args: effectiveValue});
    this.setState(AsyncStateStateBuilder.success(effectiveValue, savedProps));
  }
}

function nextUniqueId() {
  return ++uniqueId;
}

let uniqueId: number = 0;
const sourceIsSourceSymbol: symbol = Symbol();

const defaultForkConfig: ForkConfigType = Object.freeze({keepState: false});

function makeSource<T>(asyncState: AsyncStateInterface<T>) {
  const source: AsyncStateSource = constructAsyncStateSource(asyncState);
  source.key = asyncState.key;

  Object.defineProperty(source, sourceIsSourceSymbol, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  if (__DEV__) {
    source.uniqueId = asyncState.uniqueId;
  }

  return Object.freeze(source);
}


function notifySubscribers(asyncState: AsyncStateInterface<any>) {
  Object.values(asyncState.subscriptions).forEach(subscription => {
    subscription.callback(asyncState.currentState);
  });
}

function clearSubscribers(asyncState: AsyncStateInterface<any>) {
  Object.values(asyncState.subscriptions).forEach(subscription => {
    subscription.cleanup();
  });
}


export function isAsyncStateSource(possiblySource: any) {
  return possiblySource && possiblySource[sourceIsSourceSymbol] === true;
}
