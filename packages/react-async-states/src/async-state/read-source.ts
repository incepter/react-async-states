import {AsyncStateInterface, AsyncStateSource} from "./types";
import AsyncState from "./AsyncState";
import {asyncStatesKey} from "./utils";

export function readAsyncStateFromSource<T>(possiblySource: AsyncStateSource<T>): AsyncStateInterface<T> {
  try {
    const candidate = possiblySource.constructor(asyncStatesKey);
    if (!(candidate instanceof AsyncState)) {
      throw new Error("");// this error is thrown to trigger the catch block
    }
    return candidate; // async state instance
  } catch (e) {
    throw new Error("You ve passed an incompatible source object. Please make sure to pass the received source object.");
  }
}
