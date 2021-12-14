import { __DEV__, AsyncStateStatus, cloneProducerProps, invokeIfPresent, shallowClone } from "shared";
import { wrapProducerFunction } from "./wrap-producer-function";
import {
  AsyncStateStateBuilder,
  constructAsyncStateSource,
  warnDevAboutAsyncStateKey,
  warnInDevAboutRunWhilePending
} from "./utils";
import devtools from "devtools";

function AsyncState(key, producer, config) {
  warnDevAboutAsyncStateKey(key);

  this.key = key;
  this.config = shallowClone(defaultASConfig, config);
  this.originalProducer = producer;

  const initialValue = typeof this.config.initialValue === "function" ? this.config.initialValue() : this.config.initialValue;
  this.currentState = AsyncStateStateBuilder.initial(initialValue);
  this.lastSuccess = this.currentState;

  this.forkCount = 0;
  this.subscriptionsMeter = 0;

  this.subscriptions = {};
  this.producer = wrapProducerFunction(this);
  this.suspender = undefined;

  this.__IS_FORK__ = false;

  this.payload = null;
  this.currentAborter = undefined;

  this.locks = 0;

  if (__DEV__) {
    this.uniqueId = nextUniqueId();
  }

  this._source = makeSource(this);

  Object.preventExtensions(this);

  if (__DEV__) devtools.emitCreation(this);
}

AsyncState.prototype.setState = function setState(newState, notify = true) {
  if (__DEV__) devtools.startUpdate(this);
  if (typeof newState === "function") {
    this.currentState = newState(this.currentState);
  } else {
    this.currentState = newState;
  }

  if (this.currentState.status === AsyncStateStatus.success) {
    this.lastSuccess = this.currentState;
  }

  if (this.currentState.status !== AsyncStateStatus.pending) {
    this.suspender = undefined;
    this.currentAborter = undefined;
  }
  if (__DEV__) devtools.emitUpdate(this);

  if (notify) {
    notifySubscribers(this);
  }
}

AsyncState.prototype.abort = function abortImpl(reason) {
  invokeIfPresent(this.currentAborter, reason);
}

AsyncState.prototype.dispose = function disposeImpl() {
  if (this.locks > 0) {
    return false;
  }

  this.abort();
  clearSubscribers(this);

  this.locks = 0;
  const initialValue = typeof this.config.initialValue === "function" ? this.config.initialValue() : this.config.initialValue;
  this.setState(AsyncStateStateBuilder.initial(initialValue));
  if (__DEV__) devtools.emitDispose(this);

  return true;
}

AsyncState.prototype.run = function run(...execArgs) {
  if (this.currentState.status === AsyncStateStatus.pending) {
    warnInDevAboutRunWhilePending(this.key);
    this.abort();
    this.currentAborter = undefined;
  }

  const that = this;

  let onAbortCallbacks = [];

  const props = {
    abort,
    args: execArgs,
    aborted: false,
    payload: this.payload,
    lastSuccess: this.lastSuccess,
    onAbort(cb) {
      onAbortCallbacks.push(cb);
    }
  };

  function abort(reason) {
    if (props.aborted) {
      // already aborted!
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
  return this.currentAborter;
}

AsyncState.prototype.subscribe = function subscribe(cb, subKey) {
  let that = this;
  this.subscriptionsMeter += 1;
  let subscriptionKey = subKey;

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

AsyncState.prototype.fork = function fork(forkConfig) {
  const mergedConfig = shallowClone(defaultForkConfig, forkConfig);

  let {key} = mergedConfig;

  if (key === undefined) {
    key = forkKey(this);
  }

  const clone = new AsyncState(key, this.originalProducer, this.config);

  // if something fail, no need to increment
  this.forkCount += 1;

  if (mergedConfig.keepState) {
    clone.currentState = shallowClone(this.currentState);
    clone.lastSuccess = shallowClone(this.lastSuccess);
  }

  clone.__IS_FORK__ = true;

  return clone;
}

AsyncState.prototype.replaceState = function replaceState(newValue) {
  if (this.currentState.status === AsyncStateStatus.pending) {
    this.abort();
    this.currentAborter = undefined;
  }

  let effectiveValue = newValue;
  if (typeof newValue === "function") {
    effectiveValue = newValue(this.currentState);
  }

  if (__DEV__) devtools.emitReplaceState(this);
  this.setState(AsyncStateStateBuilder.success(effectiveValue));
}

function nextUniqueId() {
  return ++uniqueId;
}

let uniqueId = 0;
const sourceIsSourceSymbol = Symbol();

const defaultForkConfig = Object.freeze({keepState: false});
export const defaultASConfig = Object.freeze({initialValue: null});

function forkKey(asyncState) {
  return `${asyncState.key}-fork-${asyncState.forkCount + 1}`;
}

function makeSource(asyncState) {
  const source = constructAsyncStateSource(asyncState);
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


function notifySubscribers(asyncState) {
  Object.values(asyncState.subscriptions).forEach(subscription => {
    subscription.callback(asyncState.currentState);
  });
}

function clearSubscribers(asyncState) {
  Object.values(asyncState.subscriptions).forEach(subscription => {
    subscription.cleanup();
  });
}


export function isAsyncStateSource(source) {
  return !!source && source[sourceIsSourceSymbol] === true;
}

export default AsyncState;
