import {isFunction} from "./index";

export function areRunEffectsSupported() {
  return isFunction(setTimeout);
}
