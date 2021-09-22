import { devtoolsJournalEvents, toDevtoolsEvents } from "./eventTypes";
import { shallowClone } from "shared";

const source = "async-states-agent";
const devtools = ((function makeDevtools() {
  let queue = [];
  let connected = false;
  let currentUpdate = null;

  return {
    connect,
    disconnect,

    emitCreation,
    emitRunSync,
    emitRunPromise,
    emitRunGenerator,
    startUpdate,
    emitUpdate,
    emitDispose,
    emitSubscription,
    emitUnsubscription,

    emitAsyncState,
    emitProviderState,

    emitInsideProvider,
  };

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
        uniqueId: asyncState.uniqueId,
        state: asyncState.currentState,
        lastSuccess: asyncState.lastSuccess,
        subscriptions: Object.keys(asyncState.subscriptions)
      },
      type: toDevtoolsEvents.asyncState
    });
  }

  function emitJournalEvent(asyncState, evt) {

    emit({
      source,
      payload: {
        key: asyncState.key,
        uniqueId: asyncState.uniqueId,

        eventType: evt.type,
        eventDate: Date.now(),
        eventPayload: evt.payload,
      },
      type: toDevtoolsEvents.journal
    });
  }

  function emitCreation(asyncState) {
    emitJournalEvent(asyncState, {
      type: devtoolsJournalEvents.creation,
      payload: {
        config: asyncState.config,
        state: asyncState.currentState
      },
    });
  }

  function emitInsideProvider(asyncState, insideProvider) {
    emitJournalEvent(asyncState, {
      payload: insideProvider,
      type: devtoolsJournalEvents.insideProvider,
    });
  }

  function emitRun(asyncState, argv, type) {
    emitJournalEvent(asyncState, {
      payload: {argv, type},
      type: devtoolsJournalEvents.run
    });
  }

  function emitRunSync(asyncState, argv) {
    emitJournalEvent(asyncState, {
      payload: {argv, type: "sync"},
      type: devtoolsJournalEvents.run
    });
  }

  function emitRunGenerator(asyncState, argv) {
    emitJournalEvent(asyncState, {
      payload: {argv, type: "generator"},
      type: devtoolsJournalEvents.run
    });
  }

  function emitRunPromise(asyncState, argv) {
    emitJournalEvent(asyncState, {
      payload: {argv, type: "promise"},
      type: devtoolsJournalEvents.run
    });
  }

  function emitDispose(asyncState) {
    emitJournalEvent(asyncState, {
      payload: {
        state: asyncState.currentState,
        lastSuccess: asyncState.lastSuccess
      },
      type: devtoolsJournalEvents.dispose
    });
  }

  function emitSubscription(asyncState, subKey) {
    emitJournalEvent(asyncState, {
      payload: subKey,
      type: devtoolsJournalEvents.subscription
    });
  }

  function emitUnsubscription(asyncState, subKey) {
    emitJournalEvent(asyncState, {
      payload: subKey,
      type: devtoolsJournalEvents.unsubscription
    });
  }

  function emitUpdate(asyncState) {
    emitJournalEvent(asyncState, {
      payload: {
        oldState: currentUpdate.oldState,
        newState: asyncState.currentState,
        lastSuccess: asyncState.lastSuccess,
      },
      type: devtoolsJournalEvents.update
    });
  }

  function startUpdate(asyncState) {
    currentUpdate = {
      uniqueId: asyncState.uniqueId,
      oldState: shallowClone(asyncState.currentState),
    };
  }
})());


function formatEntriesToDevtools(entries) {
  return Object.entries(entries).reduce((result, [key, entry]) => {
    result[entry.value.uniqueId] = {};
    result[entry.value.uniqueId].key = entry.value.key;
    result[entry.value.uniqueId].uniqueId = entry.value.uniqueId;
    result[entry.value.uniqueId].state = entry.value.currentState;
    result[entry.value.uniqueId].lastSuccess = entry.value.lastSuccess;
    result[entry.value.uniqueId].subscriptions = Object.keys(entry.value.subscriptions);
    return result;
  }, {});
}

export default devtools;
