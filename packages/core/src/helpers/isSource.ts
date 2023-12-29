import { Source } from "../types";
import { StateSource } from "../AsyncState";

export function isSource<TData, TArgs extends unknown[], TError>(
  maybeSource: any
): maybeSource is Source<TData, TArgs, TError> {
  return maybeSource instanceof StateSource;
}
