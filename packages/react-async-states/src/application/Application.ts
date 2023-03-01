import {useInternalAsyncState} from "../useInternalAsyncState";
import {
  createSource,
  PartialUseAsyncStateConfiguration,
  Producer,
  ProducerConfig,
  Source,
  State,
  UseAsyncState
} from "async-states";
import {__DEV__} from "../shared";
import {useCallerName} from "../helpers/useCallerName";

let freeze = Object.freeze

type TX = {}
export let JT: TX = {} as const

export type DefaultFn<D, E, R, A extends unknown[]> = Producer<D, E, R, A>
export type ExtendedFn<D, E, R, A extends unknown[]> =
  DefaultFn<D, E, R, A>
  | TX

type AppShape = {
  [resource: string]: {
    [api: string]: {
      fn: ExtendedFn<unknown, unknown, unknown, unknown[]>
    }
  }
}

type TypedApiEntry<T, E, R, A extends unknown[]> = {
  fn: ExtendedFn<T, E, R, A>,
}

export type ApiEntry<A extends AppShape[string][string]> = TypedApiEntry<unknown, unknown, unknown, unknown[]>

export type ResourceEntry<R extends AppShape[string]> = {
  [api in keyof R]: ApiEntry<R[api]>
}
export type ApplicationEntry<T extends AppShape> = {
  [resource in keyof T]: ResourceEntry<T[resource]>
}

export type Resource<T extends AppShape[string]> = {
  [api in keyof T]: Token<
    DataOf<T[api], T[api]>,
    ErrorOf<T[api], T[api]>,
    ReasonOf<T[api], T[api]>,
    ArgsOf<T[api], T[api]>
  >
}

export type Application<T extends AppShape> = {
  [resource in keyof T]: Resource<T[resource]>
}

type DataOf<A extends AppShape[string][string], T extends ApiEntry<A>> = T["fn"] extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never
type ErrorOf<A extends AppShape[string][string], T extends ApiEntry<A>> = T["fn"] extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never
type ReasonOf<A extends AppShape[string][string], T extends ApiEntry<A>> = T["fn"] extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never
type ArgsOf<A extends AppShape[string][string], T extends ApiEntry<A>> = T["fn"] extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never

export function createApplication<
  Shape extends AppShape,
>(
  shape: ApplicationEntry<Shape>,
): Application<Shape> {
  let resources = Object.keys(shape)

  return freeze(resources.reduce((
    result: Application<Shape>,
    resourceName: keyof ApplicationEntry<Shape>
  ) => {
    let resource = shape[resourceName]
    let apis = Object.keys(resource)

    result[resourceName] = freeze(apis.reduce((
      apiResult, apiName: keyof typeof resource) => {
      let api = resource[apiName]
      apiResult[apiName] = freeze(createToken(resourceName, apiName, api))

      return apiResult
    }, {} as Resource<typeof resource>))

    return result
  }, {} as Application<Shape>))
}


function createToken<
  Shape extends AppShape,
  K extends AppShape[string][string],
  D extends ApiEntry<K>
>(
  resourceName: keyof Shape,
  apiName: keyof Shape[keyof Shape],
  api: D
): Token<DataOf<D, D>, ErrorOf<D, D>, ReasonOf<D, D>, ArgsOf<D, D>> {
  type T = DataOf<D, D>
  type E = ErrorOf<D, D>
  type R = ReasonOf<D, D>
  type A = ArgsOf<D, D>
  type TokenType = Token<T, E, R, A>

  let source: Source<T, E, R, A> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  function token(): Source<T, E, R, A> {
    if (!source) {
      let path = `app.${String(resourceName)}.${String(apiName)}`
      throw new Error(`Must call ${path}.inject before calling ${path}() or ${path}.use()`)
    }
    return source;
  }

  token.use = use;
  token.inject = inject;
  return token;

  function use<S = State<T, E, R, A>>(
    config?: UseConfig<T, E, R, A, S>,
    deps?: any[]
  ): UseAsyncState<T, E, R, A, S> {

    let caller;
    if (__DEV__) {
      caller = useCallerName(3);
    }
    let source = token()
    return useInternalAsyncState(caller, {...config, source}, deps);
  }

  function inject(
    fn: Producer<T, E, R, A>, config?: ProducerConfig<T, E, R, A>): TokenType {
    if (!source) {
      source = createSource(name, fn, config);
    }
    source.replaceProducer(fn)
    source.patchConfig(config)
    return token
  }
}


export type UseConfig<T, E, R, A extends unknown[], S = State<T, E, R, A>> = Omit<PartialUseAsyncStateConfiguration<T, E, R, A, S>, "key" | "producer" | "source" | "pool" | "context">

export type Token<T, E, R, A extends unknown[]> = {
  (): Source<T, E, R, A>,
  inject(
    fn: Producer<T, E, R, A>,
    config?: ProducerConfig<T, E, R, A>
  ): Token<T, E, R, A>
  use<S = State<T, E, R, A>>(
    config?: UseConfig<T, E, R, A, S>,
    deps?: any[]
  ): UseAsyncState<T, E, R, A, S>,
}
