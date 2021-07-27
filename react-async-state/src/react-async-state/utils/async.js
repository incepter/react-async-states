import { invokeIfPresent } from "../../utils";

export function callAsync(fn){
  return function caller(...args){
    return Promise.resolve().then(function callFn(){
      invokeIfPresent(fn, ...args);
    });
  }
}
