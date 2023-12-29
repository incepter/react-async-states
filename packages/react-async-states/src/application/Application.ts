import type {Producer, ProducerConfig, Source, State,} from "async-states"
import {createContext, createSource} from "async-states";
import {__DEV__, assign} from "../shared";
import {useCallerName} from "../helpers/useCallerName";
import {UseAsyncState, UseConfig} from "../types.internal";
import internalUse from "./internalUse";
import {__DEV__setHookCallerName} from "../hooks/modules/HookSubscription";
import {useAsync} from "../hooks/useAsync_export";

let freeze = Object.freeze

type TX = {}
export let JT: TX = {} as const

export type DefaultFn<D, A extends unknown[], E> = Producer<D, A, E>
export type ExtendedFn<D, A extends unknown[], E> =
  DefaultFn<D, A, E>
  | typeof JT

export interface Api<TData extends unknown, A extends unknown[], E extends unknown> {

  fn: ExtendedFn<TData, A, E>,
  eager?: boolean,
  producer?: Producer<TData, A, E>,
  config?: ProducerConfig<TData, A, E>
}

type AppShape = Record<string, Record<string, any>>

export type ApplicationEntry<S extends AppShape> = {
  [resource in keyof S]: {
    [api in keyof S[resource]]: Api<
      S[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
      S[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
      S[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
    >
  }
}

export type Application<S extends AppShape> = {
  [resource in keyof S]: {
    [api in keyof S[resource]]: Token<
      S[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
      S[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
      S[resource][api]["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
    >
  }
}

export function createApplication<Shape extends AppShape>(
  shape: ApplicationEntry<Shape>,
  contextArgToUse?: object,
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
    let ctxArg = contextArgToUse ?? null;
    createContext(ctxArg);

    result[resourceName] = freeze(apis.reduce((
      apiResult, apiName: keyof typeof resource) => {
      let api = resource[apiName]
      apiResult[apiName] = freeze(createToken(resourceName, apiName, api, ctxArg));
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
  >,
  contextArgToUse: object | null
): Token<
  K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never,
  K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never,
  K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
> {
  type TData = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? T : never
  type E = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
  type A = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never

  type TokenType = Token<TData, A, E>

  let apiSource: Source<TData, A, E> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  // eagerly create the apiSource
  if (api.eager) {
    let apiConfig = api.config;
    if (contextArgToUse !== null) {
      apiConfig = assign({}, apiConfig, {context: contextArgToUse});
    }
    apiSource = createSource(name, api.producer, apiConfig) as Source<TData, A, E>
  }


  token.inject = inject;
  token.useAsyncState = useHook;
  token.use = createR18Use(() => apiSource!, resourceName, apiName);
  return token;

  function token(): Source<TData, A, E> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);
    return apiSource!;
  }

  function inject(
    fn: Producer<TData, A, E> | null,
    config?: ProducerConfig<TData, A, E>
  ): TokenType {
    if (!apiSource) {
      let apiConfig = config;
      if (contextArgToUse !== null) {
        apiConfig = assign({}, apiConfig, {context: contextArgToUse});
      }
      apiSource = createSource(name, fn, apiConfig);
    } else {
      apiSource.replaceProducer(fn || null)
      apiSource.patchConfig(config)
    }
    return token
  }

  function useHook<S = State<TData, A, E>>(
    config?: UseConfig<TData, A, E, S>,
    deps?: unknown[]
  ): UseAsyncState<TData, A, E, S> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);

    if (__DEV__) {
      __DEV__setHookCallerName(useCallerName(3));
    }

    let source = token();
    let realConfig = config ? {...config, source} : source;
    return useAsync(realConfig, deps || []);
  }
}

let defaultJT = {fn: JT}

function buildDefaultJT<TData, A extends unknown[], E>(): { fn: ExtendedFn<TData, A, E> } {
  return defaultJT as { fn: ExtendedFn<TData, A, E> }
}

export function api<TData, A extends unknown[] = [], E = Error>(
  props?: Omit<Api<TData, A, E>, "fn">
): Api<TData, A, E> {
  return Object.assign({}, props, buildDefaultJT<TData, A, E>())
}

export type Token<TData, A extends unknown[], E> = {
  (): Source<TData, A, E>,
  inject(
    fn: Producer<TData, A, E>,
    config?: ProducerConfig<TData, A, E>
  ): Token<TData, A, E>
  use(
    config?: UseConfig<TData, A, E>,
    deps?: any[]
  ): TData,
  useAsyncState<S = State<TData, A, E>>(
    config?: UseConfig<TData, A, E, S>,
    deps?: any[]
  ): UseAsyncState<TData, A, E, S>
}

function ensureSourceIsDefined(source, resourceName, resourceApi) {
  if (!source) {
    let path = `app.${String(resourceName)}.${String(resourceApi)}`
    throw new Error(`Must call ${path}.inject(producer) before calling ${path}() or ${path}.use()`)
  }
}

function createR18Use<TData, A extends unknown[], E>(
  getSource: () => Source<TData, A, E>,
  resourceName: string | symbol | number,
  apiName: string | symbol | number
): ((
  config?: UseConfig<TData, A, E, State<TData, A, E>>,
  deps?: any[]
) => TData) {

  return function useImpl(
    config?: UseConfig<TData, A, E>,
    deps?: any[]
  ) {
    let source = getSource();
    ensureSourceIsDefined(source, resourceName, apiName);

    if (__DEV__) {
      __DEV__setHookCallerName(useCallerName(3));
    }

    return internalUse(source, config, deps);
  }

}
