import { ASYNC_STATUS, EMPTY_OBJECT, invokeIfPresent } from "../utils";
import { wrapPromise } from "./wrappers/wrap-promise";
import { notifySubscribers } from "./notify-subscribers";

const defaultConfig = Object.freeze({ lazy: true });

function AsyncState({ key, promise, config }) {
  this.key = key; // todo: check key
  this.config = config;
  this.originalPromise = promise;

  this.oldState = undefined;
  this.currentState = {
    args: null,
    data: null, // null if initial and loading, full of data if success, full of error if error
    status: ASYNC_STATUS.initial,
  }

  this.forkCount = 0;
  this.subscriptionsMeter = 0;

  this.subscriptions = {};
  this.promise = wrapPromise(this);

  this.__IS_FORK__ = false;

  this.renderCtx = null;
  this.providerCtx = null;
  this.currentAborter = null;

  Object.preventExtensions(this);
}

AsyncState.prototype.setState = function(newState, replaceOldState = true, notify = true) {
  if (replaceOldState) {
    this.oldState = { ...this.currentState };
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

AsyncState.prototype.run = function(...runnerArgs) {
  if (this.currentState.status === ASYNC_STATUS.loading ) { // todo: make this configurable with another attr from config
    invokeIfPresent(this.currentAborter);
    this.currentAborter = null;
  }

  let cancelled = false;
  const that = this;

  const mergedArgs = { ...runnerArgs, cancelled };
  const argsObject = inferAsyncStateRunArgsObject(this, mergedArgs);

  function abort(reason) {
    argsObject.cancelled = true;
    that.setState({
      data: reason,
      args: argsObject,
      status: ASYNC_STATUS.aborted,
    });
  }

  this.promise(argsObject);
  this.currentAborter = abort;
  return abort;
}

function inferAsyncStateRunArgsObject(asyncState, argsObject) {
  const { cancelled, ...runnerArgs } = argsObject;
  return {
    cancelled,
    executionArgs: runnerArgs,
    lastState: asyncState.oldState,
    renderCtx: asyncState.renderCtx,
    providerCtx: asyncState.providerCtx,
  };
}

AsyncState.prototype.subscribe = function(cb) {
  let that = this;
  this.subscriptionsMeter += 1;
  let subscriptionKey = `${this.key}-sub-${this.subscriptionsMeter}`;
  function cleanup() {
    delete that.subscriptions[subscriptionKey];
  }
  this.subscriptions[subscriptionKey] = {
    cleanup,
    callback: cb,
    key: subscriptionKey,
  };
  return cleanup;
}

const defaultForkConfig = Object.freeze({ keepState: false, keepSubscriptions: false });

AsyncState.prototype.fork = function(forkConfig = defaultForkConfig) {
  const mergedConfig = { ...defaultConfig, ...forkConfig };

  const clone = new AsyncState({
    key: forkKey(this),
    config: this.config,
    promise: this.originalPromise,
  });

  this.forkCount += 1;

  if (mergedConfig.keepState) {
    clone.currentState = { ...this.currentState };
    clone.oldState = { ...(this.oldState ?? EMPTY_OBJECT)};
  }

  if (mergedConfig.keepSubscriptions) {
    clone.subscriptions = { ...this.subscriptions };
  }

  clone.__IS_FORK__ = true;

  return clone;
}

function forkKey(asyncState) {
  if (typeof asyncState.key === 'string') {
    return `${asyncState.key}-fork-${asyncState.forkCount + 1}`;
  }
  throw new Error("only string allowed");
}

export default AsyncState;
