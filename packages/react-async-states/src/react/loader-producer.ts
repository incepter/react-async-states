import {
  createSource,
  Producer,
  ProducerConfig,
  ProducerProps, Source, State
} from "../async-state";
import {
  makeUseAsyncStateReturnValue,
  runAsyncStateSubscriptionFn
} from "./useAsyncStateBase";
import {readInstanceFromSource} from "../async-state/AsyncState";
import {SubscriptionMode, UseAsyncState} from "../types.internal";

export function createLoaderProducer<T>(
  producer: Loader<T>, loaderKey?: string, config?: ProducerConfig<T>): LoaderProducer<T> {

  const source = createSource(`loader-${loaderKey}`, undefined, config) as Source<T>;
  let instance = readInstanceFromSource(source);

  function wrapperProducer(props: ProducerProps<T>) {

    const loaderProps: LoaderProps = props.args[0];
    const nextProps: LoaderProducerProps<T> = Object.assign({}, props, loaderProps);

    return producer(nextProps);
  }

  return async function loader(props: LoaderProps) {
    source.replaceProducer(wrapperProducer);
    const result = await source.runp(props);
    let mode = SubscriptionMode.SRC;

    return makeUseAsyncStateReturnValue(
      instance, result, source.key,
      runAsyncStateSubscriptionFn(mode, instance, null), mode);
  }
}

type LoaderProps = {
  signal: AbortSignal,
  params: Record<string, any>,
}
type Loader<T> = {
  (props: LoaderProps): T
}

type LoaderProducer<T> = (props: LoaderProps) => Promise<Readonly<UseAsyncState<T, State<T>>>>

interface LoaderProducerProps<T> extends ProducerProps<T> {
  signal: AbortSignal,
  params: Record<string, any>,
}
