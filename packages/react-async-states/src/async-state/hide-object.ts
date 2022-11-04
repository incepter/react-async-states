import {asyncStatesKey} from "./utils";
import {StateInterface} from "./index";

function Secret() {
  let key = null;
  let value = null;
  return function Source(...args) {
    if (args.length === 1 && args[0] === key) {
      return value;
    }
    if (args.length === 2 && !key && !value) {
      key = args[0];
      value = args[1];
    }
  };
}

export function hideStateInstanceInNewObject<T>(asyncState: StateInterface<T>): {} {
  // @ts-ignore
  let output = new (Secret())();
  output.constructor(asyncStatesKey, asyncState);

  return output;
}
