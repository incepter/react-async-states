import { fetchUserData, fetchUserPosts, fetchUsersList } from "./api";
import { bindAbortAndCancelToken, omitSearchParams } from "../../shared/utils";
import { createSourceAsyncState } from "react-async-states";

export function* getCurrentUser(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUserData(argv.payload.userId, {cancelToken});
}

export function getUserDetails(argv) {
  if (!argv.payload.userId) {
    throw "userId is required";
  }
  const cancelToken = bindAbortAndCancelToken(argv);

  return fetchUserData(argv.payload.userId, {cancelToken});
}

export function* getUsersList(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUsersList({params: omitSearchParams(argv.payload.queryString), cancelToken});
}

export function* getUserPosts(argv) {
  const cancelToken = bindAbortAndCancelToken(argv);

  return yield fetchUserPosts(argv.payload.userId, {cancelToken});
}


export const DOMAIN_USER_PRODUCERS = Object.freeze({
  list: {
    key: "users-list",
    producer: getUsersList
  },
  current: {
    key: "current-user",
    producer: getCurrentUser
  },
  posts: {
    key: "user-posts",
    producer: getUserPosts
  },
  details: createSourceAsyncState("user-details", getUserDetails),
});
