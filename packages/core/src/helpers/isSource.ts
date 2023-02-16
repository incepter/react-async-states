import {Source} from "../types";

export let sourceSymbol: symbol = Symbol();

export function isSource<T, E, R>(possiblySource: any): possiblySource is Source<T, E, R> {
  return possiblySource && possiblySource[sourceSymbol] === true;
}
