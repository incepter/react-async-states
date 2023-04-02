import {api, createApplication, ProducerProps} from "react-async-states";
import {UserType} from "./users/types";
import {PostType} from "./posts/types";
import {API} from "./api";
import {bindAbort} from "../utils";

let goodUxConfig = {
  skipPendingDelayMs: 300,
  keepPendingForMs: 300,
}
let myApp = {
  posts: {
    search: api<PostType[], Error, never, [string]>(),
  },
  users: {
    search: api<UserType[], Error, never, [string]>(),
    findById: api<UserType, Error, never, [string]>(),
    deleteUser: api<boolean, Error, never, [string]>(),
    editUser: api<UserType, Error, never, [UserType]>(),
    addNewPost: api<PostType, Error, never, [PostType]>(),
    findUserPosts: api<UserType, Error, never, [string]>(),
  },
  auth: {
    login: api<string, Error, never, [string, string]>({
      eager: true,
      config: goodUxConfig,
      producer: loginProducer,
    }),
    current: api<UserType, Error, never, []>({
      eager: true,
      producer: currentUserProducer,
      config: {
        ...goodUxConfig,
        cacheConfig: {
          enabled: true,
          hash: () => localStorage.getItem("__principal_id__v1.0") as string
        }
      },
    }),
  },
}

export let app = createApplication<typeof myApp>(myApp)

// Static producers
async function loginProducer(props: ProducerProps<string, Error, never, [string, string]>) {
  let [userId] = props.args
  if (!+userId) {
    throw new Error(`UserId ${userId} is not a number between 1 and 10`)
  }
  console.log('boom with', userId)
  localStorage.setItem("__principal_id__v1.0", userId)
  await app.auth.current().runp()
  return userId
}

async function currentUserProducer(props: ProducerProps<UserType, Error, never, []>) {
  let signal = bindAbort(props)
  let currentUserId = localStorage.getItem("__principal_id__v1.0")
  if (!currentUserId) {
    throw new Error("No saved user")
  }

  let userDetails = await API.get<UserType>(`/users/${currentUserId}`, {signal});
  return userDetails.data
}

export function logout() {
  localStorage.removeItem("__principal_id__v1.0")
  app.auth.current().invalidateCache()
  app.auth.current().run()
}
