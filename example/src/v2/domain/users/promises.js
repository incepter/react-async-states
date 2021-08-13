import { fetchUserData, fetchUserPosts, fetchUsersList } from "./api";
import { bindAbortAndCancelToken, omitSearchParams } from "../../shared/utils";

export function* getCurrentUser(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUserData(argv.payload.userId, {cancelToken});
}

export function* getUserDetails(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUserData(argv.payload.userId, {cancelToken});
}

export function* getUsersList(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUsersList({params: omitSearchParams(argv.payload.queryString), cancelToken});
}

export function* getUserPosts(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUserPosts(argv.payload.userId, {cancelToken});
}


export const DOMAIN_USER_PROMISES = Object.freeze({
  list: {
    lazy: false,
    key: "users-list",
    promise: getUsersList
  },
  current: {
    lazy: false,
    key: "current-user",
    promise: getCurrentUser
  },
  posts: {
    lazy: false,
    key: "user-posts",
    promise: getUserPosts
  },
  details: {
    lazy: false,
    key: "user-details",
    promise: getUserDetails,
  },
});
