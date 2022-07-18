import {Producer} from "../async-state";
import {Reducer} from "../types.internal";

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

// export function createFetchProducer<T>(producer) {
//   return function wrapperProducer(props: ProducerProps<T>) {
//     const controller = new AbortController();
//     props.onAbort(() => controller.abort());
//     return producer({...props, signal: controller.signal});
//   }
// }
//
// export function createRetryableProducer<T>(producer, config) {
//   return async function wrapperProducer(props: ProducerProps<T>) {
//
//     let {maxRetries, isRetryable} = config;
//
//     let result;
//     let retryIndex = 0;
//
//     while(retryIndex < maxRetries) {
//
//       retryIndex += 1;
//       try {
//         result = await props.runp(producer, {payload: props.payload}, ...props.args);
//       } catch (e) {
//         if (!isRetryable(e) || retryIndex >= maxRetries) {
//           throw e;
//         }
//       }
//
//     }
//     return result;
//   }
// }
