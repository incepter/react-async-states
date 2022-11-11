import axios from "axios";

export const API = axios.create({
	baseURL: "https://jsonplaceholder.typicode.com",
});

export const get = (url: string, params = {}, options = {}) =>
	API.get(url, { ...options, params });
export const post = (url: string, body = {}, options = {}) =>
	API.post(url, body, { ...options });
export const put = (url: string, body = {}, options = {}) =>
	API.put(url, body, { ...options });
export const patch = (url: string, body = {}, options = {}) =>
	API.patch(url, body, { ...options });
export const deleteMethod = (url: string, options = {}) =>
	API.delete(url, { ...options });
