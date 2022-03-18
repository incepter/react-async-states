import {ProducerProps} from "react-async-states";

export function bindAbortController(props: ProducerProps<any>): AbortSignal {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());
  return controller.signal;
}
