export function timeoutProducer(delay = 2000) {
  return function delayed(argv) {
    let timeoutId;
    argv.onAbort(function cancelTimeout() {
      clearTimeout(timeoutId);
    });

    return new Promise(function delayed(resolve) {
      timeoutId = setTimeout(function timeouted() {
        console.log(`timeout of delay '${delay}' has collapsed!`)
        return resolve();
      }, delay);
    });
  }
}

// function returns state value
// argv

export function* usersProducer(argv) {
  const controller = new AbortController();
  const {signal} = controller;
  argv.onAbort(function abortSignal() {
    controller.abort();
  });

  return yield fetch('https://jsonplaceholder.typicode.com/users', {signal})
    .then(res => res.json());
}

export function postsProducer(argv) {
  const controller = new AbortController();
  const {signal} = controller;
  argv.onAbort(function abortSignal() {
    controller.abort();
  });

  return fetch('https://jsonplaceholder.typicode.com/posts', {signal})
    .then(res => res.json());
}

export function getUserProducer(argv) {
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
