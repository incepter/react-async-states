import { fetchUserData, fetchUserPosts, fetchUsersList } from "./api";
import { bindAbortAndCancelToken, omitSearchParams } from "../../shared/utils";
import { createSource } from "react-async-states";

export function* getCurrentUser(props) {
  const cancelToken = bindAbortAndCancelToken(props);

  return yield fetchUserData(props.payload.userId, {cancelToken});
}

export function getUserDetails(props) {
  if (!props.payload.userId) {
    throw "userId is required";
  }
  const cancelToken = bindAbortAndCancelToken(props);

  return fetchUserData(props.payload.userId, {cancelToken});
}

export function* getUsersList(props) {
  const cancelToken = bindAbortAndCancelToken(props);

  return yield fetchUsersList({params: omitSearchParams(props.payload.queryString), cancelToken});
}

export function* getUserPosts(props) {
  const cancelToken = bindAbortAndCancelToken(props);

  return yield fetchUserPosts(props.payload.userId, {cancelToken});
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
  details: createSource("user-details", getUserDetails),
});
