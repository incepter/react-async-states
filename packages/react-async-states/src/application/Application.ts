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
  MixedConfig,
  Producer, ProducerConfig,
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
      let fn = api.fn;

      type FF = typeof fn;
      type Fn = Exclude<FF, TX> extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? Producer<T, E, R> : never

      type DataOf = Fn extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? T : never
      type ErrorOf = Fn extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? E : never
      type ReasonOf = Fn extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? R : never
      type ArgsOf = Fn extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? A : never

      apiResult[apiName] = createToken<Shape>(resourceName, apiName, api as Fn) as Token<DataOf, ErrorOf, ReasonOf, ArgsOf>;

      return apiResult
    }, {} as Resource<typeof resource>)

    return result
  }, {} as Application<Shape>)
}


function createToken<
  Shape extends AppShape,
  // T,
  // E,
  // R,
  // A extends unknown[]
>(
  resourceName: keyof Shape,
  apiName: keyof Shape[keyof Shape],
  api: ApplicationEntry<Shape>[keyof ApplicationEntry<Shape>][keyof ApplicationEntry<Shape>[keyof ApplicationEntry<Shape>]],
): (typeof api["fn"]) extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? Token<T, E, R, A> : never   {

  let fn = api.fn;
  type NeededSource = (Exclude<typeof api["fn"], TX>) extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? Source<T, E, R> : never
  type NeededProducer = (Exclude<typeof api["fn"], TX>) extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? Producer<T, E, R> : never
  type NeededProducerConfig = (Exclude<typeof api["fn"], TX>) extends DefaultFn<infer T, infer E, infer R, infer A extends unknown[]> ? ProducerConfig<T, E, R> : never


  let source: NeededSource | null = null
  let name = `app__${String(resourceName)}_${String(apiName)}__`

  function token(): NeededSource {
    if (!source) {
      let path = `app.${String(resourceName)}.${String(apiName)}`
      throw new Error(`Must call ${path}.define before calling ${path}() or ${path}.use()`)
    }
    return source;
  }

  function define(fn: NeededProducer, config?: NeededProducerConfig): NeededSource {
    source = createSource(name, fn) as NeededSource;
    return source
  }

  // function use() {}

  // token.use = use;
  token.define = define;
  return token;
}


type Page<T = unknown> = {}
type User = {}

type MyType = {
  users: {
    search: {
      fn: (query: string) => Promise<Page<User>>
    },
  },
  posts: {
    delete: {
      fn: (id: string) => boolean
    }
  }
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
let t = app.users.search()
let st = app.posts.delete.define()


