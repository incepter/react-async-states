import {isFn} from "./index";

export const enableComponentSuspension = true;

export function areRunEffectsSupported() {
  return isFn(setTimeout);
}
