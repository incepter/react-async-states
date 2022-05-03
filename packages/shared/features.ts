import {isFn} from "./index";

export function areRunEffectsSupported() {
  return isFn(setTimeout);
}
