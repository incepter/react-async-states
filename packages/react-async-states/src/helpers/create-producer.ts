import {Producer} from "../../../async-state";
import {Reducer} from "../types";

export function createReducerProducer<T>(reducerFn: Reducer<T>): Producer<T> {
  if (typeof reducerFn !== "function") {
    throw new Error(
      `Reducer producer creator expects reducerFn to be a function.` +
      ` received ${typeof reducerFn}`
    );
  }
  return function reducer(props) {
    return reducerFn(
      props.lastSuccess.data,
      ...props.args
    );
  }
}
