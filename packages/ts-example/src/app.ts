import {AxiosResponse} from "axios";
import {api, createApplication,} from "react-async-states";

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
