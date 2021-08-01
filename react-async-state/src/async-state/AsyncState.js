import { AsyncStateStatus, EMPTY_OBJECT, invokeIfPresent, mergeObjects } from "../shared";
import { wrapPromise } from "./wrappers/wrap-promise";
import { clearSubscribers, notifySubscribers } from "./notify-subscribers";
import { AsyncStateBuilder } from "./StateBuilder";

const defaultConfig = Object.freeze({lazy: true});

function AsyncState(key, promise, config) {
  this.key = key; // todo: check key
  this.config = mergeObjects(EMPTY_OBJECT, config);
  this.originalPromise = promise;

  this.previousState = undefined;
  this.currentState = {
    args: null,
    data: null, // null if initial and loading, full of data if success, full of error if error
    status: AsyncStateStatus.initial,
  }

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

AsyncState.prototype.setState = function setState(newState, replacePreviousState = true, notify = true) {
  if (replacePreviousState) {
    this.previousState = {...this.currentState};
  }
  if (typeof newState === "function") {
    this.currentState = newState(this.currentState);
  } else {
    this.currentState = newState;
  }
  if (notify) {
    notifySubscribers(this);
  }
}

AsyncState.prototype.abort = function abortImpl(reason) {
  invokeIfPresent(this.currentAborter, reason);
}
AsyncState.prototype.dispose = function disposeImpl() {
  if (this.locks > 1) {
    return false;
  }
  invokeIfPresent(this.abort.bind(this));
  clearSubscribers(this);
  this.subscriptions = {};
  return true;
}

AsyncState.prototype.run = function run(...execArgs) {
  if (this.currentState.status === AsyncStateStatus.loading) {
    this.abort();
    this.currentAborter = null;
  }

  const that = this;

  let userAborter = null;

  const argsObject = {
    aborted: false,
    payload: this.payload,
    executionArgs: execArgs,
    previousState: this.previousState,
    onAbort(cb) {
      userAborter = cb;
    }
  };

  function abort(reason) {
    if (argsObject.aborted) {
      // already aborted!
      return;
    }
    argsObject.aborted = true;
    that.setState(AsyncStateBuilder.aborted(reason, argsObject));
    invokeIfPresent(userAborter);
  }

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

AsyncState.prototype.fork = function fork(forkConfig = defaultForkConfig) {
  const mergedConfig = {...defaultConfig, ...forkConfig};

  const clone = new AsyncState(forkKey(this), this.originalPromise, this.config);

  this.forkCount += 1;

  if (mergedConfig.keepState) {
    clone.currentState = {...this.currentState};
    clone.previousState = {...(this.previousState ?? EMPTY_OBJECT)};
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

  this.setState(AsyncStateBuilder.success(effectiveValue));
}

export default AsyncState;
