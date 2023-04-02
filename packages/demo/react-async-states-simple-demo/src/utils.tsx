import {ProducerProps} from "async-states";

export function bindAbort<T, E, R, A extends unknown[]>(
  props: ProducerProps<T, E, R, A>
): AbortSignal {
  let controller = new AbortController()
  props.onAbort((reason) => controller.abort(reason))
  return controller.signal
}
