import {AxiosResponse} from "axios";
import {api, createApplication,} from "react-async-states";

let myApp = {
  users: {
    search: api<Page<User>, Error, never, [QueryParams]>(),
    findById: api<AxiosResponse<User>, Error, never, [string]>(),
    add: api<boolean, Error, never, [User]>(),
    posts: api<Page<Post>, Error, never, [string]>()
  },
  posts: {
    search: api<Page<User>, Error, never, [QueryParams]>(),
    findById: api<Page<User>, Error, never, [string]>(),
    delete: api<number, Error, never, [string]>()
  },
}

export let app = createApplication<typeof myApp>(myApp)
//
// app.users.add.inject(addUserProducer)
// function AppUser() {
//   let {state, runc: submit} = app.users.add.use()
//
//   function onEvent(values) {
//     submit({args: values, onSuccess, onError})
//   }
//
//   return <UI onEvent={onEvent}/>
// }
//
// app.users.search().invalidateCache("query")
// app.users.findById().run("typedStringUserId")

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
