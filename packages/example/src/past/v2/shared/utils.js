import axios from "axios";

export function promiseOf(resolvedValue) {
  return new Promise(function resolver(resolve) {
    resolve(resolvedValue);
  })
}

export function bindAbortAndCancelToken(props) {
  const source = axios.CancelToken.source();

  props.onAbort(function abortCb() {
    source.cancel();
  })

  return source.token;
}

export const API_JPH = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com"
});

export function readJson(response) {
  return response.json();
}


export function readData(response) {
  return response.data;
}

export function parseSearch(search) {
  if (!search) {
    return {};
  }
  return Object.fromEntries(new URLSearchParams(search.substring(1)));
}

export function omitSearchParams(obj) {
  if (!obj) {
    return obj;
  }
  const output = {};
  Object.entries(obj)
    .forEach(([key, value]) => {
      if (value || value === 0) {
        output[key] = value;
      }
    })
  return output;
}

export function readFormValues(form) {
  const formElements = form.elements;

  return [...formElements]
    .filter(t => t.value)
    .reduce((result, current) => {
      if (current.value) {
        result[current.name] = current.value;
      }
      return result;
    }, {});
}
