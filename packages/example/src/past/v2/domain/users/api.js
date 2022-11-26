import { API_JPH, readData } from "../../shared/utils";

export function fetchUserData(userId, params) {
  return API_JPH.get(`/users/${userId}`, params).then(readData);
}

export function fetchUsersList(params) {
  return API_JPH.get("/users", params).then(readData);
}

export function fetchUserPosts(userId, params) {
  return API_JPH.get(`/users/${userId}/posts`, params).then(readData);
}
