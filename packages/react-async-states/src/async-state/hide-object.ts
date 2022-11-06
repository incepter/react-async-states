import {asyncStatesKey} from "./utils";
import {StateInterface} from "./index";

function Secret() {
  let key = null;
  let value = null;
  return function Source() {
    if (arguments.length === 1 && arguments[0] === key) {
      return value;
    }
    if (arguments.length === 2 && !key && !value) {
      key = arguments[0];
      value = arguments[1];
    }
  };
}

export function hideStateInstanceInNewObject<T>(asyncState: StateInterface<T>): {} {
  // @ts-ignore
  let output = new (Secret())();
  output.constructor(asyncStatesKey, asyncState);

  return output;
}
