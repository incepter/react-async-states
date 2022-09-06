import {
  AsyncStateKey,
  AsyncStateSource,
  ForkConfig,
  Producer,
  ProducerConfig,
  State
} from "../async-state";
import {
  EqualityFn,
  HoistToProviderConfig,
  UseAsyncState,
  UseAsyncStateEvents,
  useSelector
} from "../types.internal";
import {useAsyncStateBase} from "./useAsyncStateBase";

interface BaseConfig<T> extends ProducerConfig<T>{
  subscriptionKey?: AsyncStateKey,

  lazy?: boolean,
  condition?: boolean,
  payload?: { [id: string]: any },

  fork?: boolean,
  forkConfig?: ForkConfig,

  hoistToProvider?: boolean,
  hoistToProviderConfig?: HoistToProviderConfig,

  events?: UseAsyncStateEvents<T>,
  lane?: string,
}

interface ConfigWithKeyWithSelector<T, E> extends ConfigWithKeyWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}
interface ConfigWithKeyWithoutSelector<T> extends BaseConfig<T> {
  key?: AsyncStateKey,
}

interface ConfigWithSourceWithSelector<T, E> extends ConfigWithSourceWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}

interface ConfigWithSourceWithoutSelector<T> extends BaseConfig<T> {
  source?: AsyncStateSource<T>,
}

interface ConfigWithProducerWithSelector<T, E> extends ConfigWithProducerWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}

interface ConfigWithProducerWithoutSelector<T> extends BaseConfig<T> {
  producer?: Producer<T>,
}

type MixedConfig<T, E> = AsyncStateKey | AsyncStateSource<T> | Producer<T> |
  ConfigWithKeyWithSelector<T, E> |
  ConfigWithKeyWithoutSelector<T> |
  ConfigWithSourceWithSelector<T, E> |
  ConfigWithSourceWithoutSelector<T> |
  ConfigWithProducerWithSelector<T, E> |
  ConfigWithProducerWithoutSelector<T>;


type InternalState<T, E> = {
  version: number,
  return: UseAsyncState<T, E>,
}


const defaultDeps = [];
function useAsyncState(key: AsyncStateKey, deps: any[]): UseAsyncState<unknown>
function useAsyncState<T>(source: AsyncStateSource<T>, deps: any[])
function useAsyncState<T>(producer: Producer<T>, deps: any[])
function useAsyncState<T, E>(configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E>, deps: any[])
function useAsyncState<T>(configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T>, deps: any[])
function useAsyncState<T, E>(configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E>, deps: any[])
function useAsyncState<T>(configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T>, deps: any[])
function useAsyncState<T, E>(configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E>, deps: any[])
function useAsyncState<T>(configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T>, deps: any[]): UseAsyncState<T>
function useAsyncState<T, E = State<T>>(mixedConfig: MixedConfig<T, E>, deps: any[] = defaultDeps): UseAsyncState<T, E>
{
  return useAsyncStateBase(mixedConfig, deps);
}

export const newUseAsyncState = useAsyncState;
