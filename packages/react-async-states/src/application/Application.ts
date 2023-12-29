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

export type DefaultFn<D, TArgs extends unknown[], TError> = Producer<D, TArgs, TError>
export type ExtendedFn<D, TArgs extends unknown[], TError> =
  DefaultFn<D, TArgs, TError>
  | typeof JT

export interface Api<TData extends unknown, TArgs extends unknown[], TError extends unknown> {

  fn: ExtendedFn<TData, TArgs, TError>,
  eager?: boolean,
  producer?: Producer<TData, TArgs, TError>,
  config?: ProducerConfig<TData, TArgs, TError>
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
  type TError = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? E : never
  type TArgs = K["fn"] extends ExtendedFn<infer T, infer A extends unknown[], infer E> ? A : never

  type TokenType = Token<TData, TArgs, TError>

  let apiSource: Source<TData, TArgs, TError> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  // eagerly create the apiSource
  if (api.eager) {
    let apiConfig = api.config;
    if (contextArgToUse !== null) {
      apiConfig = assign({}, apiConfig, {context: contextArgToUse});
    }
    apiSource = createSource(name, api.producer, apiConfig) as Source<TData, TArgs, TError>
  }


  token.inject = inject;
  token.useAsyncState = useHook;
  token.use = createR18Use(() => apiSource!, resourceName, apiName);
  return token;

  function token(): Source<TData, TArgs, TError> {
    ensureSourceIsDefined(apiSource, resourceName, apiName);
    return apiSource!;
  }

  function inject(
    fn: Producer<TData, TArgs, TError> | null,
    config?: ProducerConfig<TData, TArgs, TError>
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

  function useHook<S = State<TData, TArgs, TError>>(
    config?: UseConfig<TData, TArgs, TError, S>,
    deps?: unknown[]
  ): UseAsyncState<TData, TArgs, TError, S> {
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

function buildDefaultJT<TData, TArgs extends unknown[], TError>(): { fn: ExtendedFn<TData, TArgs, TError> } {
  return defaultJT as { fn: ExtendedFn<TData, TArgs, TError> }
}

export function api<TData, TArgs extends unknown[] = [], TError = Error>(
  props?: Omit<Api<TData, TArgs, TError>, "fn">
): Api<TData, TArgs, TError> {
  return Object.assign({}, props, buildDefaultJT<TData, TArgs, TError>())
}

export type Token<TData, TArgs extends unknown[], TError> = {
  (): Source<TData, TArgs, TError>,
  inject(
    fn: Producer<TData, TArgs, TError>,
    config?: ProducerConfig<TData, TArgs, TError>
  ): Token<TData, TArgs, TError>
  use(
    config?: UseConfig<TData, TArgs, TError>,
    deps?: any[]
  ): TData,
  useAsyncState<S = State<TData, TArgs, TError>>(
    config?: UseConfig<TData, TArgs, TError, S>,
    deps?: any[]
  ): UseAsyncState<TData, TArgs, TError, S>
}

function ensureSourceIsDefined(source, resourceName, resourceApi) {
  if (!source) {
    let path = `app.${String(resourceName)}.${String(resourceApi)}`
    throw new Error(`Must call ${path}.inject(producer) before calling ${path}() or ${path}.use()`)
  }
}

function createR18Use<TData, TArgs extends unknown[], TError>(
  getSource: () => Source<TData, TArgs, TError>,
  resourceName: string | symbol | number,
  apiName: string | symbol | number
): ((
  config?: UseConfig<TData, TArgs, TError, State<TData, TArgs, TError>>,
  deps?: any[]
) => TData) {

  return function useImpl(
    config?: UseConfig<TData, TArgs, TError>,
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
