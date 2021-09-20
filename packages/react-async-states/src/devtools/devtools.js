import { toDevtoolsEvents } from "./eventTypes";

const source = "async-states-agent";
const devtools = ((function makeDevtools() {
  let queue = [];
  let connected = false;

  return {connect, disconnect, emitAsyncState, emitProviderState};

  function connect() {
    connected = true;
    if (queue.length) {
      queue.forEach(emit);
    }
  }

  function disconnect() {
    connected = false;
  }

  function emit(message) {
    if (connected) {
      window.postMessage(JSON.parse(JSON.stringify(message)), "*");
    }
    queue.push(message);
    queue = [];
  }

  function emitProviderState(entries) {
    emit({
      source,
      type: toDevtoolsEvents.provider,
      payload: formatEntriesToDevtools(entries)
    });
  }

  function emitAsyncState(asyncState) {
    if (!asyncState) {
      return;
    }
    emit({
      source,
      payload: {
        key: asyncState.key,
        state: asyncState.currentState,
        lastSuccess: asyncState.lastSuccess,
        subscriptions: Object.keys(asyncState.subscriptions)
      },
      type: toDevtoolsEvents.asyncState
    });
  }
})());

function formatEntriesToDevtools(entries) {
  return Object.entries(entries).reduce((result, [key, entry]) => {
    result[key] = {};
    result[key].state = entry.value.currentState;
    result[key].lastSuccess = entry.value.lastSuccess;
    result[key].subscriptions = Object.keys(entry.value.subscriptions);
    return result;
  }, {});
}

export default devtools;
