export function timeoutPromise(delay = 2000) {
  return function delayed(argv) {
    let timeoutId;
    argv.onAbort(function cancelTimeout() {
      clearTimeout(timeoutId);
    });

    return new Promise(function delayed(resolve) {
      timeoutId = setTimeout(function timeouted() {
        return resolve();
      }, delay);
    });
  }
}

export function usersPromise(argv) {
  const controller = new AbortController();
  const {signal} = controller;
  argv.onAbort(function abortSignal() {
    controller.abort();
  });

  return fetch('https://jsonplaceholder.typicode.com/users', {signal})
    .then(res => res.json());
}

export function postsPromise(argv) {
  const controller = new AbortController();
  const {signal} = controller;
  argv.onAbort(function abortSignal() {
    controller.abort();
  });

  return fetch('https://jsonplaceholder.typicode.com/posts', {signal})
    .then(res => res.json());
}

export function getUserPromise(argv) {
  const controller = new AbortController();
  const {signal} = controller;
  argv.onAbort(function abortSignal() {
    controller.abort();
  });

  return fetch(`https://jsonplaceholder.typicode.com/users/${argv.payload?.matchParams?.userId}`, {signal})
    .then(res => res.json());
}

export function reducerDemo() {
}
