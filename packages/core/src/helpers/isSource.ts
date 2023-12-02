import { Source } from "../types";
import { StateSource } from "../AsyncState";

export let sourceSymbol: symbol = Symbol();

export function isSource<T, A extends unknown[], E>(
	possiblySource: any
): possiblySource is Source<T, A, E> {
	return possiblySource && possiblySource instanceof StateSource;
}
