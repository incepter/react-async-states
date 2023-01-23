export let sourceSymbol: symbol = Symbol();

export function isSource(possiblySource: any) {
  return possiblySource && possiblySource[sourceSymbol] === true;
}
