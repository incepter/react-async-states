import {
  createApplication,
  DefaultFn,
  api,
  ProducerProps,
} from "react-async-states";
import {AxiosResponse} from "axios";
import {ApplicationEntry, ExtendedFn} from "react-async-states";
import {Producer, ProducerConfig} from "async-states";
// import {InferAppShape} from "react-async-states";


type Page<T = unknown> = {
  content: T[]
}
export type User = {
  username: string,
  email: string
}
type Post = {
  title: string
}

type QueryParams = {}
type MyApplicationShape = {
  users: {
    search: {
      fn: DefaultFn<Page<User>, Error, "reason", [QueryParams]>
    },
    findById: {
      fn: DefaultFn<AxiosResponse<User>, Error, "reason", [string]>
    },
    add: {
      fn: DefaultFn<boolean, Error, "reason", [User]>
    },
    posts: {
      fn: DefaultFn<Page<Post>, Error, "reason", [string]>
    }
  },
  posts: {
    search: {
      fn: DefaultFn<Page<User>, Error, "reason", [QueryParams]>
    },
    findById: {
      fn: DefaultFn<Page<User>, Error, "reason", [string]>
    },
    delete: {
      fn: DefaultFn<number, Error, "reason", [string]>
    }
  },
}
// This could be done automatically via some plugin, it takes the same shape
// above and replaces fn by JT, that's all.
// This object can be unreferenced immediately; myApp = null;
let myApp = {
  users: {
    search: api<Page<User>, Error, "reason", [QueryParams]>(),
    findById: api<Page<User>, Error, "reason", [string]>(),
    add: api<boolean, Error, "reason", [User]>(),
    posts: api<Page<Post>, Error, "reason", [string]>()
  },
  posts: {
    search: api<Page<User>, Error, "reason", [QueryParams]>(),
    findById: api<Page<User>, Error, "reason", [string]>(),
    delete: api<number, Error, "reason", [string]>()
  },
}


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


export type InferAppShape<T> = T extends (infer Shape extends ApplicationEntry<infer K extends AppShape>) ? K : never
type AppType = typeof myApp;

type TTT = AppType extends ApplicationEntry<infer L extends AppShape> ? L : never


type Created = InferAppShape<AppType>;
let app = createApplication(myApp)

// let st = app.posts.delete.define()

