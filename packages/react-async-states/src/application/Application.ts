/**
 * createApplication({
 *   users: {
 *     search(query)
 *   }
 *   todos: {
 *     add() {}
 *     submit() {}
 *   }
 *   weather: {}
 * }) {
 *
 * }
 *
 *
 *
 *
 * createApplication(shape)
 *
 * shape<App>: {
 *   [prop in keyof App]: App[prop]
 * }
 *
 */
type TX = {}
let JT: TX = {} as const

import {
  createSource,
  Producer, ProducerConfig, ProducerProps,
  Source,
  State,
  UseAsyncState
} from "async-states/src";

type DefaultFn<D, E, R, A extends unknown[]> = Producer<D, E, R>
type ExtendedFn<D, E, R, A extends unknown[]> = DefaultFn<D, E, R, A> | TX

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

type ApiEntry<A extends AppShape[string][string]> = TypedApiEntry<unknown, unknown, unknown, unknown[]>

type ResourceEntry<R extends AppShape[string]> = {
  [api in keyof R]: ApiEntry<R[api]>
}
type ApplicationEntry<T extends AppShape> = {
  [resource in keyof T]: ResourceEntry<T[resource]>
}

type Token<T, E, R, K extends unknown[]> = {
  (): Source<T, E, R>,
  define(fn: Producer<T, E, R>, config?: ProducerConfig<T, E, R>): Source<T, E, R>
  // use(config?: MixedConfig<T, E, R, State<T, E, R>>, deps?: any[]): UseAsyncState<T, E, R, State<T, E, R>>,
}


type Resource<T extends AppShape[string]> = {
  [api in keyof T]: T[api]["fn"] extends ExtendedFn<infer D, infer E, infer R, infer K extends unknown[]> ? Token<D, E, R, K> : never
}

type Application<T extends AppShape> = {
  [resource in keyof T]: Resource<T[resource]>
}

type DataOf<A extends AppShape[string][string], T extends ApiEntry<A>> = Exclude<T["fn"], TX> extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never
type ErrorOf<A extends AppShape[string][string], T extends ApiEntry<A>> = Exclude<T["fn"], TX> extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never
type ReasonOf<A extends AppShape[string][string], T extends ApiEntry<A>> = Exclude<T["fn"], TX> extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never
type ArgsOf<A extends AppShape[string][string], T extends ApiEntry<A>> = Exclude<T["fn"], TX> extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never

export function createApplication<
  Shape extends AppShape,
>(
  shape: ApplicationEntry<Shape>,
): Application<Shape> {
  let resources = Object.keys(shape)

  return resources.reduce((
    result: Application<Shape>,
    resourceName: keyof ApplicationEntry<Shape>
  ) => {
    let resource = shape[resourceName]
    let apis = Object.keys(resource)

    result[resourceName] = apis.reduce((
      apiResult, apiName: keyof typeof resource) => {
      let api = resource[apiName]
      type ApiType = typeof api

      type T = DataOf<ApiType, ApiType>
      type E = ErrorOf<ApiType, ApiType>
      type R = ReasonOf<ApiType, ApiType>
      type A = ArgsOf<ApiType, ApiType>

      type TokenType = Token<T, E, R, A>
      apiResult[apiName] = createToken<
        Shape,
        ApiType,
        ApiType
      >(resourceName, apiName, api)

      return apiResult
    }, {} as Resource<typeof resource>)

    return result
  }, {} as Application<Shape>)
}


function createToken<
  Shape extends AppShape,
  K extends AppShape[string][string],
  D extends ApiEntry<K>
>(
  resourceName: keyof Shape,
  apiName: keyof Shape[keyof Shape],
  api: D
): D["fn"] extends ExtendedFn<infer D, infer E, infer R, infer K extends unknown[]> ? Token<D, E, R, K> : never {
  type T = DataOf<typeof api, typeof api>
  type E = ErrorOf<typeof api, typeof api>
  type R = ReasonOf<typeof api, typeof api>
  type A = ArgsOf<typeof api, typeof api>
  type TokenType = D["fn"] extends ExtendedFn<infer D, infer E, infer R, infer K extends unknown[]> ? Token<D, E, R, K> : never

  let source: Source<T, E, R> | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  function token(): Source<T, E, R> {
    if (!source) {
      let path = `app.${String(resourceName)}.${String(apiName)}`
      throw new Error(`Must call ${path}.define before calling ${path}() or ${path}.use()`)
    }
    return source;
  }

  function define(fn: Producer<T, E, R>, config?: ProducerConfig<T, E, R>): Source<T, E, R> {
    source = createSource(name, fn);
    return source
  }

  token.define = define;
  return token as TokenType;
}

/**
 *
 *
 *
 * DEMO
 *
 *
 *
 *
 *
 */
type Page<T = unknown> = {}
type User = {}

type MyType = {
  users: {
    search: {
      fn: DefaultFn<Promise<User>, Error, "reason", [string]>
    },
  },
  posts: {
    delete: {
      fn: DefaultFn<Promise<number>, Error, "reason", [string]>
    }
  },
}

let MyApp = {
  users: {
    search: {
      fn: JT
    }
  },
  posts: {
    delete: {
      fn: JT,
    }
  }
}

let app = createApplication<MyType>(MyApp)
let t = app.users.search

// let st = app.posts.delete.define()


