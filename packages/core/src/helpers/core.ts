export let noop = () => {};
export let now = () => Date.now();
export let freeze = Object.freeze;
export let isArray = Array.isArray;

export function shallowClone(source1: any, source2?: any) {
  return Object.assign({}, source1, source2);
}

let uniqueId: number = 0;
export function nextUniqueId() {
  return ++uniqueId;
}
