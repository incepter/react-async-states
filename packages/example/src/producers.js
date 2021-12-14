export function timeoutProducer(delay = 2000) {
  return function delayed(props) {
    let timeoutId;
    props.onAbort(function cancelTimeout() {
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
// props

export function* usersProducer(props) {
  const controller = new AbortController();
  const {signal} = controller;
  let timeoutId;
  props.onAbort(function abortSignal() {
    clearTimeout(timeoutId);
    controller.abort();
  });

  return yield new Promise(res => timeoutId = setTimeout(res, 2000)).then(() => fetch('https://jsonplaceholder.typicode.com/users', {signal})
    .then(res => res.json()));
}

export function postsProducer(props) {
  const controller = new AbortController();
  const {signal} = controller;
  props.onAbort(function abortSignal() {
    controller.abort();
  });

  return fetch('https://jsonplaceholder.typicode.com/posts', {signal})
    .then(res => res.json());
}

export function getUserProducer(props) {
  const controller = new AbortController();
  const {signal} = controller;
  props.onAbort(function abortSignal() {
    controller.abort();
  });

  return fetch(`https://jsonplaceholder.typicode.com/users/${props.payload?.matchParams?.userId}`, {signal})
    .then(res => res.json());
}

export function reducerDemo() {
}
