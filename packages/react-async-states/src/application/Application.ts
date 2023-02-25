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
type Todo = {}

let rt = () => {}
type RT = typeof rt

let myApp = {
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
  }
}

type Application<App extends RawExtend> = {
  [slice in keyof App]: {
    [api in keyof App[slice]]: {
      fn: (Pick<App[slice][api], "fn">["fn"] extends ((...args: infer X) => infer Y) ? ((...args: X) => Y) : never) | RT
    }
  }
}


export function createApplication<A extends RawExtend>(
  shape: Application<A>
): {app: ApplicationToken<A>, define: ApplicationDefine<A>} {
  let app = {} as ApplicationToken<A>;

  for (let slice of Object.keys(shape)) {
    let sliceShape = shape[slice]
    type SliceType = typeof sliceShape
    type KeysOfSlice = keyof SliceType

    type ResultType = {
      [k in keyof SliceType]: Pick<SliceType[k], "fn">["fn"] extends ((...args: infer A extends any[]) => infer B) ? Token<B, A> : never
    }

    let result = {} as ResultType

    for (let api of Object.keys(sliceShape)) {
      let {fn} = sliceShape[api]
      type Data = ReturnType<typeof fn>
      type Args = Parameters<typeof fn>

      let token: Token<Data, Args> = createToken<Data, Args>(slice, api);
      console.log('dd' , token)
      // @ts-ignore
      result[api as KeysOfSlice] = token
    }

    // @ts-ignore
    app[slice as keyof ApplicationToken<A>] = result;
  }

  return {app, define: null};
}

type RawExtend = { [slice: string]: { [api: string]: { fn: ((...args: any[]) => any) } } }

type ApplicationToken<App extends RawExtend> = {
  [slice in keyof App]: {
    [api in keyof App[slice]]: Pick<App[slice][api], "fn">["fn"] extends ((...args: infer A) => infer B) ? Token<B, A> : never
  }
}
type ApplicationDefine<App extends RawExtend> = {
  [slice in keyof App]: {
    [api in keyof App[slice]]: Pick<App[slice][api], "fn">["fn"] extends ((...args: infer A) => infer B) ? ((producer: Producer<B>) => void) : never
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

let {app, define} = createApplication<MyAppType>(myApp)

app.users.search("username=toto&page=1&size=5&sort=")
app.posts.remove("14")
app.todos.add({})

define.posts.search(fetchUser)

let {state} = use(app.users.search("query"), fetchUser)


console.log('App', app)

function fetchPost(): Promise<Post> {
  return Promise.resolve().then(() => ({}))
}

function fetchUser(): Promise<User> {
  return Promise.resolve().then(() => ({}))
}
