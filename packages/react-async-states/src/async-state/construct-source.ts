import {AsyncStateInterface, AsyncStateSource} from "./types";
import {asyncStatesKey} from "./utils";

function Secret() {
  const vault = new WeakMap();
  return function Source() {
    if (arguments.length === 1) {
      return vault.get(arguments[0]);
    }
    if (arguments.length === 2) {
      vault.set(arguments[0], arguments[1]);
    }
  };
}

function objectWithHiddenProperty(
  key: Object,
  value: AsyncStateInterface<any>
) {
  // @ts-ignore
  let output = new (Secret())();
  output.constructor(key, value);

  return output;
}

export function constructAsyncStateSource<T>(asyncState: AsyncStateInterface<T>): AsyncStateSource<T> {
  return objectWithHiddenProperty(asyncStatesKey, asyncState);
}
