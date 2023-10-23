import {useInternalAsyncState} from "../useInternalAsyncState";
import type {
  Producer,
  ProducerConfig,
  Source,
  State,
} from "async-states"
import {createSource,} from "async-states";
import {__DEV__} from "../shared";
import {useCallerName} from "../helpers/useCallerName";
import {UseAsyncState, UseConfig} from "../types.internal";
import internalUse from "./internalUse";

let freeze = Object.freeze

type TX = {}
export let JT: TX = {} as const

export type DefaultFn<D, E, R, A extends unknown[]> = Producer<D, E, R, A>
export type ExtendedFn<D, E, R, A extends unknown[]> =
  DefaultFn<D, E, R, A>
  | typeof JT

export interface Api<T extends unknown, E extends unknown, R extends unknown, A extends unknown[]> {

  fn: ExtendedFn<T, E, R, A>,
  eager?: boolean,
  producer?: Producer<T, E, R, A>,
  config?: ProducerConfig<T, E, R, A>
}

type AppShape = Record<string, Record<string, any>>

export type ApplicationEntry<T extends AppShape> = {
  [resource in keyof T]: {
    [api in keyof T[resource]]: Api<
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
    >
  }
}

export type Application<T extends AppShape> = {
  [resource in keyof T]: {
    [api in keyof T[resource]]: Token<
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
    >
  }
}

export function createApplication<Shape extends AppShape>(
  shape: ApplicationEntry<Shape>,
): Application<Shape> {

  let resources = Object.keys(shape)
  return freeze(resources.reduce((
    result: Application<Shape>,
    resourceName: keyof ApplicationEntry<Shape>
  ) => {
    let resource = shape[resourceName]
    let apis = Object.keys(resource)

    type ResourceType<T extends typeof resource> = {
      [api in keyof T]: Token<
        T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never,
        T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never,
        T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never,
        T[api]["fn"] extends ExtendedFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never
      >
    }

    result[resourceName] = freeze(apis.reduce((
      apiResult, apiName: keyof typeof resource) => {
      let api = resource[apiName]
      apiResult[apiName] = freeze(createToken(resourceName, apiName, api))
      return apiResult
    }, {} as ResourceType<typeof resource>))

    return result
  }, {} as Application<Shape>))
}

function createToken<
  Shape extends AppShape,
  K extends Shape[keyof Shape][keyof Shape[keyof Shape]]
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

  let apiSource: Source<T, E, R, A> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  // eagerly create the apiSource
  if (api.eager) {
    apiSource = createSource(name, api.producer, api.config) as Source<T, E, R, A>
  }


  token.inject = inject;
  token.useAsyncState = useHook;
  token.use = createR18Use(() => apiSource!, resourceName, apiName);
  return token;

  function token(): Source<T, E, R, A> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);
    return apiSource!;
  }

  function inject(
    fn: Producer<T, E, R, A> | null,
    config?: ProducerConfig<T, E, R, A>
  ): TokenType {
    if (!apiSource) {
      apiSource = createSource(name, fn, config);
    } else {
      apiSource.replaceProducer(fn || null)
      apiSource.patchConfig(config)
    }
    return token
  }

  function useHook<S = State<T, E, R, A>>(
    config?: UseConfig<T, E, R, A, S>,
    deps?: any[]
  ): UseAsyncState<T, E, R, A, S> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);

    let caller;
    if (__DEV__) {
      caller = useCallerName(4);
    }

    let source = token()
    let realConfig = config ? {...config, source} : source;
    return useInternalAsyncState(caller, realConfig, deps);
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

export type Token<T, E, R, A extends unknown[]> = {
  (): Source<T, E, R, A>,
  inject(
    fn: Producer<T, E, R, A>,
    config?: ProducerConfig<T, E, R, A>
  ): Token<T, E, R, A>
  use(
    config?: UseConfig<T, E, R, A>,
    deps?: any[]
  ): T,
  useAsyncState<S = State<T, E, R, A>>(
    config?: UseConfig<T, E, R, A, S>,
    deps?: any[]
  ): UseAsyncState<T, E, R, A, S>
}

function ensureSourceIsDefined(source, resourceName, resourceApi) {
  if (!source) {
    let path = `app.${String(resourceName)}.${String(resourceApi)}`
    throw new Error(`Must call ${path}.inject(producer) before calling ${path}() or ${path}.use()`)
  }
}

function createR18Use<T, E, R, A extends unknown[]>(
  getSource: () => Source<T, E, R, A>,
  resourceName: string | symbol | number,
  apiName: string | symbol | number
): ((
  config?: UseConfig<T, E, R, A, State<T, E, R, A>>,
  deps?: any[]
) => T) {
  return function useImpl(
    config?: UseConfig<T, E, R, A>,
    deps?: any[]
  ) {
    let source = getSource();
    ensureSourceIsDefined(source, resourceName, apiName);

    return internalUse(source, config, deps);
  }
}
