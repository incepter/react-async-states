import { AsyncStateStatus, invokeIfPresent, shallowClone } from "../shared";
import { wrapPromise } from "./wrappers/wrap-promise";
import { clearSubscribers, notifySubscribers } from "./notify-subscribers";
import { AsyncStateStateBuilder } from "./StateBuilder";
import {
  logInDevAbort,
  logInDevDispose,
  logInDevPromiseRun,
  logInDevReplaceState,
  logInDevStateChange,
  warnDevAboutAsyncStateKey,
  warnDevAboutUndefinedPromise,
  warnInDevAboutRunWhileLoading
} from "../utils";

export const defaultASConfig = Object.freeze({lazy: true, initialValue: null});

function AsyncState(key, promise, config) {
  warnDevAboutAsyncStateKey(key);
  warnDevAboutUndefinedPromise(key, promise);

  this.key = key;
  this.config = shallowClone(defaultASConfig, config);
  this.originalPromise = promise;

  this.lastSuccess = undefined;
  this.currentState = AsyncStateStateBuilder.initial(this.config.initialValue);

  this.forkCount = 0;
  this.subscriptionsMeter = 0;

  this.subscriptions = {};
  this.promise = wrapPromise(this);

  this.__IS_FORK__ = false;

  this.payload = null;
  this.currentAborter = null;

  this.locks = 0;

  Object.preventExtensions(this);
}

AsyncState.prototype.setState = function setState(newState, notify = true) {
  if (typeof newState === "function") {
    this.currentState = newState(this.currentState);
  } else {
    this.currentState = newState;
  }
  logInDevStateChange(this.key, this.currentState);

  if (this.currentState.status === AsyncStateStatus.success) {
    this.lastSuccess = shallowClone(this.currentState);
  }

  if (notify) {
    notifySubscribers(this);
  }
}

AsyncState.prototype.abort = function abortImpl(reason) {
  invokeIfPresent(this.currentAborter, reason);
}

AsyncState.prototype.dispose = function disposeImpl() {
  logInDevDispose(this.key, this.locks);
  if (this.locks > 0) {
    return false;
  }
  this.locks = 0;
  clearSubscribers(this);
  this.subscriptions = {};
  this.setState(AsyncStateStateBuilder.initial(this.config.initialValue));
  return true;
}

AsyncState.prototype.run = function run(...execArgs) {
  if (this.currentState.status === AsyncStateStatus.loading) {
    warnInDevAboutRunWhileLoading(this.key);
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
    lastSuccess: shallowClone(this.lastSuccess),
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
    logInDevAbort(that.key, reason);
    that.setState(AsyncStateStateBuilder.aborted(reason, argsObject));
    userAborters.forEach(function clean(func) {
      invokeIfPresent(func, reason);
    });
  }

  logInDevPromiseRun(this.key, argsObject);
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
  }

  this.subscriptions[subscriptionKey] = {
    cleanup,
    callback: cb,
    key: subscriptionKey,
  };
  this.locks += 1;
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
  if (this.currentState.status === AsyncStateStatus.loading) {
    this.abort();
    this.currentAborter = null;
  }

  let effectiveValue = newValue;
  if (typeof newValue === "function") {
    effectiveValue = newValue(this.currentState);
  }

  logInDevReplaceState(this.key, effectiveValue);

  this.setState(AsyncStateStateBuilder.success(effectiveValue));
}

export default AsyncState;
