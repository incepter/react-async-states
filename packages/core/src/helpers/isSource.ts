import {Source} from "../types";

export let sourceSymbol: symbol = Symbol();

export function isSource<T, E, R, A extends unknown[]>(possiblySource: any): possiblySource is Source<T, E, R, A> {
  return possiblySource && possiblySource[sourceSymbol] === true;
}
