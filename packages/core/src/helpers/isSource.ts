import { Source } from "../types";
import { StateSource } from "../AsyncState";

export function isSource<TData, A extends unknown[], E>(
  maybeSource: any
): maybeSource is Source<TData, A, E> {
  return maybeSource instanceof StateSource;
}
