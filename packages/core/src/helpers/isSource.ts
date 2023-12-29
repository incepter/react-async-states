import { Source } from "../types";
import { StateSource } from "../AsyncState";

export function isSource<TData, TArgs extends unknown[], E>(
  maybeSource: any
): maybeSource is Source<TData, TArgs, E> {
  return maybeSource instanceof StateSource;
}
