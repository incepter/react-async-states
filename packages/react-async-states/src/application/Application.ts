import {useInternalAsyncState} from "../useInternalAsyncState";
import {
  createSource,
  PartialUseAsyncStateConfiguration,
  Producer,
  Source,
  State
} from "async-states";


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
type User = {}
type Post = {}
type Todo = {
  title: string
}

let rt = () => {}
type RT = typeof rt

let myAppJeton = {
  users: {
    search: {fn: rt},
  },
  todos: {
    add: {fn: rt},
    remove: {fn: rt},
  },
  posts: {
    add: {fn: rt},
    search: {fn: rt},
    remove: {fn: rt},
  },
  mahdoul: {
    ping: {
      fn: rt,
    },
    saveHisAss: {
      fn: rt,
    }
  }
}

type MyAppType = {
  users: {
    search: {
      fn: (query: string) => User
    }
  },
  todos: {
    add: {
      fn: (todo: Todo) => Todo
    }
    remove: {
      fn: () => null
    }
  }
  posts: {
    add: {
      fn: (todo: Post) => Post
    },
    search: {
      fn: (query: string) => Post
    },
    remove: {
      fn: (id: string) => boolean
    }
  },
  mahdoul: {
    ping: {
      fn: (greeting: string) => boolean,
    },
    saveHisAss: {
      fn: (input: Money) => boolean,
    }
  }
}

interface Money extends User {}

type ApplicationShape<App extends RawExtend> = {
  [slice in keyof App]: {
    [api in keyof App[slice]]: {
      fn: (Pick<App[slice][api], "fn">["fn"] extends ((...args: infer X) => infer Y) ? ((...args: X) => Y) : never) | RT
    }
  }
}

type Application<A extends RawExtend> = {
  app: ApplicationToken<A>,
  define: ApplicationDefine<A>
}

function createApplication<A extends RawExtend>(shape: ApplicationShape<A>): Application<A> {
  let app = {} as ApplicationToken<A>;

  for (let slice of Object.keys(shape)) {
    let sliceShape = shape[slice]
    type SliceType = typeof sliceShape

    let theoreticalSlice = app[slice]
    type ResultType = typeof theoreticalSlice

    let result = {} as ResultType
    for (let api of Object.keys(sliceShape)) {
      result[api as keyof SliceType] = createToken(slice, api) as ApplicationToken<A>[string][string]
    }
    app[slice as keyof ApplicationToken<A>] = result;
  }

  // @ts-ignore
  return {app, define: null};
}


type RawExtend = { [slice: string]: { [api: string]: { fn: ((...args: any[]) => any) } } }

type ApplicationToken<App extends RawExtend> = {
  [slice in keyof App]: {
    [api in keyof App[slice]]: App[slice][api]["fn"] extends ((...args: infer A) => infer B) ? Token<Exclude<B, ReturnType<RT>>, Exclude<A, Parameters<RT>>> : never
  }
}
type ApplicationDefine<App extends RawExtend> = {
  [slice in keyof App]: {
    [api in keyof App[slice]]: App[slice][api]["fn"] extends ((...args: infer A) => infer B) ? ((producer: Producer<B>) => void) : never
  }
}

type Token<Data, Args extends any[]> = {
  key: string,
  parent: string,
  (...t: Args): ExtendedToken<Data, Args>
}


function createToken<X, Y extends any[]>(
  topLevelName: string,
  name: string,
): Token<X, Y> {
  let key = `__${topLevelName}_${name}`
  let source: Source<X> | null = null

  function token(...args: Y) {
    if (!source) {
      source = createSource(key)
    }
    return source
  }
  token.key = name;
  token.parent = topLevelName;

  return token;
}
type ExtendedToken<T, A extends any[]> = Source<T, any, any>

export function use<T, E, R, A extends any[]>(
  token: ExtendedToken<T, A>,
  producer: Producer<T, E, R>,
  options?: PartialUseAsyncStateConfiguration<T, E, R, State<T, E, R>>,
  deps: any[] = []
) {
  if (producer) {
    token.replaceProducer(producer)
  }
  if (options) {
    token.patchConfig(options)
  }

  return useInternalAsyncState("use", {...options, source: token}, deps)
}

let {app, define} = createApplication<MyAppType>(myAppJeton)

app.users.search("username=toto&page=1&size=5&sort=")
app.posts.remove("14")
define.posts.search(fetchUser)

let {state} = use(app.users.search("query"), fetchUser)



function fetchPost(): Promise<Post> {
  return Promise.resolve().then(() => ({}))
}

function fetchUser(): Promise<User> {
  return Promise.resolve().then(() => ({}))
}
