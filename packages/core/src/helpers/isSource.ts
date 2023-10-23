import { Source } from "../types";
import { StateSource } from "../AsyncState";

export let sourceSymbol: symbol = Symbol();

export function isSource<T, E, A extends unknown[]>(
	possiblySource: any
): possiblySource is Source<T, E, A> {
	return possiblySource && possiblySource instanceof StateSource;
}
