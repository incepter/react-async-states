import { ASYNC_STATUS, EMPTY_OBJECT } from "../utils";
import { wrapPromise } from "../wrap-promise";

const defaultConfig = Object.freeze({ lazy: true, forkable: true });

function PromiseState({ key, promise, config }) {
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

  this.promise = wrapPromise(this);
  this.subscriptions = {};
}

PromiseState.prototype.run = function(...args) {
  this.promise(...args);
}



const defaultForkConfig = Object.freeze({ keepState: false, keepSubscriptions: false });

PromiseState.prototype.fork = function(forkConfig = defaultForkConfig) {
  const mergedConfig = { ...defaultConfig, ...forkConfig };

  const clone = new PromiseState({ key: forkKey(this), promise: this.originalPromise, config: this.config });
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

function forkKey(promiseState) {
  if (typeof promiseState.key === 'string') {
    return `${promiseState.key}-${promiseState.forkCount + 1}`;
  }
  throw new Error("only string allowed");
}
