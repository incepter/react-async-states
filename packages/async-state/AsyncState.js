import { __DEV__, AsyncStateStatus, cloneArgs, invokeIfPresent, shallowClone } from "shared";
import { wrapPromise } from "./wrappers/wrap-promise";
import { clearSubscribers, notifySubscribers } from "./notify-subscribers";
import { AsyncStateStateBuilder } from "./StateBuilder";
import {
  warnDevAboutAsyncStateKey,
  warnDevAboutUndefinedPromise,
  warnInDevAboutRunWhilePending
} from "./utils";
import devtools from "devtools";

let uniqueId = 0;
function nextUniqueId() {
  return ++uniqueId;
}

export const defaultASConfig = Object.freeze({lazy: true, initialValue: null});

function AsyncState(key, promise, config) {
  warnDevAboutAsyncStateKey(key);
  warnDevAboutUndefinedPromise(key, promise);

  this.key = key;
  this.config = shallowClone(defaultASConfig, config);
  this.originalPromise = promise;

  this.currentState = AsyncStateStateBuilder.initial(this.config.initialValue);
  this.lastSuccess = this.currentState;

  this.forkCount = 0;
  this.subscriptionsMeter = 0;

  this.subscriptions = {};
  this.promise = wrapPromise(this);

  this.__IS_FORK__ = false;

  this.payload = null;
  this.currentAborter = null;

  this.locks = 0;

  if (__DEV__) {
    this.uniqueId = nextUniqueId();
  }

  Object.preventExtensions(this);

  devtools.emitCreation(this);
}

AsyncState.prototype.setState = function setState(newState, notify = true) {
  devtools.startUpdate(this);
  if (typeof newState === "function") {
    this.currentState = newState(this.currentState);
  } else {
    this.currentState = newState;
  }

  if (this.currentState.status === AsyncStateStatus.success) {
    this.lastSuccess = this.currentState;
  }

  if (this.currentState.status !== AsyncStateStatus.pending) {
    this.currentAborter = null;
  }
  devtools.emitUpdate(this);

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
  this.setState(AsyncStateStateBuilder.initial(this.config.initialValue));
  devtools.emitDispose(this);

  return true;
}

AsyncState.prototype.run = function run(...execArgs) {
  if (this.currentState.status === AsyncStateStatus.pending) {
    warnInDevAboutRunWhilePending(this.key);
    this.abort();
    this.currentAborter = null;
  }

  const that = this;

  let userAborters = [];

  const argsObject = {
    abort,
    aborted: false,
    payload: this.payload,
    executionArgs: execArgs,
    lastSuccess: this.lastSuccess,
    onAbort(cb) {
      userAborters.push(cb);
    }
  };

  function abort(reason) {
    if (argsObject.aborted) {
      // already aborted!
      return;
    }
    argsObject.aborted = true;
    that.setState(AsyncStateStateBuilder.aborted(reason, cloneArgs([argsObject])));
    userAborters.forEach(function clean(func) {
      invokeIfPresent(func, reason);
    });
    that.currentAborter = null;
  }

  devtools.emitRun(this, argsObject);

  this.promise(argsObject);
  this.currentAborter = abort;
  return abort;
}

AsyncState.prototype.subscribe = function subscribe(cb) {
  let that = this;
  this.subscriptionsMeter += 1;
  let subscriptionKey = `${this.key}-sub-${this.subscriptionsMeter}`;

  function cleanup() {
    that.locks -= 1;
    delete that.subscriptions[subscriptionKey];
    devtools.emitUnsubscription(that, subscriptionKey);
  }

  this.subscriptions[subscriptionKey] = {
    cleanup,
    callback: cb,
    key: subscriptionKey,
  };
  this.locks += 1;

  devtools.emitSubscription(this, subscriptionKey);
  return cleanup;
}

const defaultForkConfig = Object.freeze({keepState: false});

AsyncState.prototype.fork = function fork(forkConfig) {
  const mergedConfig = shallowClone(defaultForkConfig, forkConfig);

  const clone = new AsyncState(forkKey(this), this.originalPromise, this.config);

  this.forkCount += 1;

  if (mergedConfig.keepState) {
    clone.currentState = shallowClone(this.currentState);
    clone.lastSuccess = shallowClone(this.lastSuccess);
  }

  clone.__IS_FORK__ = true;

  return clone;
}

function forkKey(asyncState) {
  return `${asyncState.key}-fork-${asyncState.forkCount + 1}`;
}

AsyncState.prototype.replaceState = function replaceState(newValue) {
  if (this.currentState.status === AsyncStateStatus.pending) {
    this.abort();
    this.currentAborter = null;
  }

  let effectiveValue = newValue;
  if (typeof newValue === "function") {
    effectiveValue = newValue(this.currentState);
  }

  this.setState(AsyncStateStateBuilder.success(effectiveValue));
}

export default AsyncState;
