import { Source } from "../types";
import { StateSource } from "../AsyncState";

export let sourceSymbol: symbol = Symbol();

export function isSource<T, E, R, A extends unknown[]>(
	possiblySource: any
): possiblySource is Source<T, E, R, A> {
	return possiblySource && possiblySource instanceof StateSource;
}
