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
  | typeof JT

type AppShape = {
  [resource: string]: {
    [api: string]: {
      fn: ExtendedFn<unknown, unknown, unknown, unknown[]>,
      eager?: boolean,
      producer?: Producer<unknown, unknown, unknown, unknown[]>,
      config?: ProducerConfig<unknown, unknown, unknown, unknown[]>,
    }
  }
}

interface BaseApi<T, E, R, A extends unknown[]> {
  fn: ExtendedFn<T, E, R, A>,
}

export interface Api<T, E, R, A extends unknown[]> extends BaseApi<T, E, R, A> {
  eager?: boolean,
  producer?: Producer<T, E, R, A>,
  config?: ProducerConfig<T, E, R, A>
}


export type ResourceEntry<R extends AppShape[string]> = {
  [api in keyof R]: Api<
    R[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
    R[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
    R[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
    R[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
  >
}
export type ApplicationEntry<T extends AppShape> = {
  [resource in keyof T]: ResourceEntry<T[resource]>
}

export type Resource<T extends AppShape[string]> = {
  [api in keyof T]: Token<
    T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
    T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
    T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
    T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
  >
}
// type HAHA = Resource<{
//   search: {
//     fn: ExtendedFn<number, Error, "hhh", [number]>
//   }
// }>
//


export type Application<T extends AppShape> = {
  [resource in keyof T]: Resource<T[resource]>
}

export function createApplication<Shape extends AppShape>(
  shape: ApplicationEntry<Shape>
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
  K extends AppShape[string][string]
>(
  resourceName: keyof Shape,
  apiName: keyof ApplicationEntry<Shape>[keyof ApplicationEntry<Shape>],
  api: Api<
    K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
    K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
    K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
    K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
  >
): Token<
  K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
  K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
  K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
  K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
> {
  type T = K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never
  type E = K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never
  type R = K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never
  type A = K["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never

  type TokenType = Token<T, E, R, A>

  let source: Source<T, E, R, A> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  // eagerly create the source
  if (api.eager) {
    source = createSource(name, api.producer, api.config) as Source<T, E, R, A>
  }

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

let defaultJT = {fn: JT}

function buildDefaultJT<T, E, R, A extends unknown[]>(): { fn: ExtendedFn<T, E, R, A> } {
  return defaultJT as { fn: ExtendedFn<T, E, R, A> }
}

export function api<T, E, R, A extends unknown[]>(
  props?: Omit<Api<T, E, R, A>, "fn">
): Api<T, E, R, A> {
  return Object.assign({}, props, buildDefaultJT<T, E, R, A>())
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

// type Page<T = unknown> = {
//   content: T[]
// }
// export type User = {
//   username: string,
//   email: string
// }
// type Post = {
//   title: string
// }
// type QueryParams = {}
// let myApp = {
//   users: {
//     search: api<Page<User>, Error, "reason", [QueryParams]>(),
//     findById: api<Page<User>, Error, "reason", [string]>(),
//     add: api<boolean, Error, "reason", [User]>(),
//     posts: api<Page<Post>, Error, "reason", [string]>()
//   },
//   posts: {
//     search: api<Page<User>, Error, "reason", [QueryParams]>(),
//     findById: api<Page<User>, Error, "reason", [string]>(),
//     delete: api<number, Error, "reason", [string]>()
//   },
// }

export type InferAppShape<T extends AppShape> = T extends (infer Shape extends ApplicationEntry<infer K extends AppShape>) ? Shape : never

// let app = createApplication<InferAppShape<typeof myApp>>(myApp)
