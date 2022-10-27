import AsyncState, {
  Source,
  Producer,
  ProducerConfig
} from "./index";

export const createSource = function createSource<T>(
  key: string,
  producer?: Producer<T> | undefined | null,
  config?: ProducerConfig<T>
): Source<T> {
  return new AsyncState(
    key,
    producer,
    config
  )._source;
}
