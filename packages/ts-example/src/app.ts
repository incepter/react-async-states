import {
  createApplication,
  DefaultFn,
  JT,
  ProducerProps
} from "react-async-states";
import {AxiosResponse} from "axios";


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
    search: { fn: JT },
    findById: { fn: JT },
    add: { fn: JT },
    posts: { fn: JT }
  },
  posts: {
    search: { fn: JT },
    findById: { fn: JT },
    delete: { fn: JT }
  },
}


export let app = createApplication<MyApplicationShape>(myApp)

// let st = app.posts.delete.define()

