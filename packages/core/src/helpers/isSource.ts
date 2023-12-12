import { Source } from "../types";
import { StateSource } from "../AsyncState";

export function isSource<T, A extends unknown[], E>(
	maybeSource: any
): maybeSource is Source<T, A, E> {
	return maybeSource instanceof StateSource;
}
