let unlisten;
function welcome(event) {
  console.log('get an event', event.data.source);
  if (
    event.source !== window ||
    event.data.source !== 'async-states-agent'
  ) {
    return;
  }

  window.removeEventListener('message', welcome);

  if (typeof unlisten === "function") {
    unlisten();
    unlisten = undefined;
  }
  unlisten = setup(event);
}

window.addEventListener('message', welcome);

function setup(evt) {
  console.log('setting up things');
  function listener (event) {
    console.log('listener', event);
    if (
      event.source !== window ||
      !event.data ||
      event.data.source !== 'async-states-content-script' ||
      !event.data.payload
    ) {
      return;
    }
    console.log('IMPORTANT EVENT', event);
  }
  listener(evt);
  window.addEventListener('message', listener);
  return () => {
    window.removeEventListener('message', listener);
  };
}

console.log('BACKEND SCRIPT INJECTED');
