import {api, createApplication,} from "react-async-states";
import {AxiosResponse} from "axios";

let myApp = {
  users: {
    search: api<Page<User>, Error, "reason", [QueryParams]>(),
    findById: api<AxiosResponse<User>, Error, "reason", [string]>(),
    add: api<boolean, Error, "reason", [User]>(),
    posts: api<Page<Post>, Error, "reason", [string]>()
  },
  posts: {
    search: api<Page<User>, Error, "reason", [QueryParams]>(),
    findById: api<Page<User>, Error, "reason", [string]>(),
    delete: api<number, Error, "reason", [string]>()
  },
}

export let app = createApplication<typeof myApp>(myApp)

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
