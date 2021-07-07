import { ASYNC_STATUS, EMPTY_OBJECT } from "../utils";
import { wrapPromise } from "./wrappers/wrap-promise";

const defaultConfig = Object.freeze({ lazy: true, forkable: true });

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

  this.promise = wrapPromise(this);
  this.subscriptions = {};
}

AsyncState.prototype.run = function(...args) {
  console.log('running async state with args', args);
  return this.promise(...args);
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
    promise: this.originalPromise,
    config: this.config
  });

  this.forkCount += 1;

  if (mergedConfig.keepState) {
    clone.currentState = { ...this.currentState };
    clone.oldState = { ...(this.oldState ?? EMPTY_OBJECT)};
  }

  if (mergedConfig.keepSubscriptions) {
    clone.subscriptions = { ...this.subscriptions };
  }

  return clone;
}

function forkKey(asyncState) {
  if (typeof asyncState.key === 'string') {
    return `${asyncState.key}-${asyncState.forkCount + 1}`;
  }
  throw new Error("only string allowed");
}

export default AsyncState;
