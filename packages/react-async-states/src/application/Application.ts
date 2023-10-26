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
import {useAsync_internal} from "../hooks/useAsync_internal";
import {__DEV__setHookCallerName} from "../hooks/modules/HookSubscription";

let freeze = Object.freeze

type TX = {}
export let JT: TX = {} as const

export type DefaultFn<D, A extends unknown[], E> = Producer<D, A, E>
export type ExtendedFn<D, A extends unknown[], E> =
  DefaultFn<D, A, E>
  | typeof JT

export interface Api<T extends unknown, A extends unknown[], E extends unknown> {

  fn: ExtendedFn<T, A, E>,
  eager?: boolean,
  producer?: Producer<T, A, E>,
  config?: ProducerConfig<T, A, E>
}

type AppShape = Record<string, Record<string, any>>

export type ApplicationEntry<T extends AppShape> = {
  [resource in keyof T]: {
    [api in keyof T[resource]]: Api<
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
    >
  }
}

export type Application<T extends AppShape> = {
  [resource in keyof T]: {
    [api in keyof T[resource]]: Token<
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
      T[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
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
        T[api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
        T[api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
        T[api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
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
    K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
    K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
    K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
  >
): Token<
  K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
  K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
  K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
> {
  type T = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never
  type E = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
  type A = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never

  type TokenType = Token<T, A, E>

  let apiSource: Source<T, A, E> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  // eagerly create the apiSource
  if (api.eager) {
    apiSource = createSource(name, api.producer, api.config) as Source<T, A, E>
  }


  token.inject = inject;
  token.useAsyncState = useHook;
  token.use = createR18Use(() => apiSource!, resourceName, apiName);
  return token;

  function token(): Source<T, A, E> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);
    return apiSource!;
  }

  function inject(
    fn: Producer<T, A, E> | null,
    config?: ProducerConfig<T, A, E>
  ): TokenType {
    if (!apiSource) {
      apiSource = createSource(name, fn, config);
    } else {
      apiSource.replaceProducer(fn || null)
      apiSource.patchConfig(config)
    }
    return token
  }

  function useHook<S = State<T, A, E>>(
    config?: UseConfig<T, A, E, S>,
    deps?: unknown[]
  ): UseAsyncState<T, A, E, S> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);

    if (__DEV__) {
      __DEV__setHookCallerName(useCallerName(4));
    }

    let source = token();
    let realConfig = config ? {...config, source} : source;
    return useAsync_internal(realConfig, deps || []);
  }
}

let defaultJT = {fn: JT}

function buildDefaultJT<T, A extends unknown[], E>(): { fn: ExtendedFn<T, A, E> } {
  return defaultJT as { fn: ExtendedFn<T, A, E> }
}

export function api<T, A extends unknown[] = [], E = Error>(
  props?: Omit<Api<T, A, E>, "fn">
): Api<T, A, E> {
  return Object.assign({}, props, buildDefaultJT<T, A, E>())
}

export type Token<T, A extends unknown[], E> = {
  (): Source<T, A, E>,
  inject(
    fn: Producer<T, A, E>,
    config?: ProducerConfig<T, A, E>
  ): Token<T, A, E>
  use(
    config?: UseConfig<T, A, E>,
    deps?: any[]
  ): T,
  useAsyncState<S = State<T, A, E>>(
    config?: UseConfig<T, A, E, S>,
    deps?: any[]
  ): UseAsyncState<T, A, E, S>
}

function ensureSourceIsDefined(source, resourceName, resourceApi) {
  if (!source) {
    let path = `app.${String(resourceName)}.${String(resourceApi)}`
    throw new Error(`Must call ${path}.inject(producer) before calling ${path}() or ${path}.use()`)
  }
}

function createR18Use<T, A extends unknown[], E>(
  getSource: () => Source<T, A, E>,
  resourceName: string | symbol | number,
  apiName: string | symbol | number
): ((
  config?: UseConfig<T, A, E, State<T, A, E>>,
  deps?: any[]
) => T) {

  return function useImpl(
    config?: UseConfig<T, A, E>,
    deps?: any[]
  ) {
    let source = getSource();
    ensureSourceIsDefined(source, resourceName, apiName);

    return internalUse(source, config, deps);
  }

}
