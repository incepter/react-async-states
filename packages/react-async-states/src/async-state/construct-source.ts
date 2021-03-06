import {AsyncStateInterface, AsyncStateSource} from "./types";
import {asyncStatesKey} from "./utils";

function Secret() {
  let key = null;
  let value = null;
  return function Source(...args) {
    if (args.length === 1 && args[0] && args[0] === key) {
      return value;
    }
    if (args.length === 2 && !key && !value) {
      key = args[0];
      value = args[1];
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
