import {
  devtoolsJournalEvents,
  devtoolsRequests,
  toDevtoolsEvents
} from "./eventTypes";
import { __DEV__, shallowClone } from "shared";

let journalEventsId = 0;
const source = "async-states-agent";
const devtools = !__DEV__ ? Object.create(null) : ((function makeDevtools() {
  let queue = [];
  let connected = false;
  let currentUpdate = null;

  function isConnected() {
    return !!connected;
  }

  return {
    isConnected,
    connect,
    disconnect,

    emitCreation,
    emitRunSync,
    emitReplaceState,
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
    emitFlush();
    console.log('flushing queue of ', queue.length, queue)
    if (queue.length) {
      queue.forEach(e => emit(e, false));
    }
  }

  function disconnect() {
    connected = false;
  }

  function emit(message, saveToQueue = true) {
    if (connected) {
      window && window.postMessage(JSON.parse(JSON.stringify(message)), "*");
    }
    if (saveToQueue && message.type !== toDevtoolsEvents.provider) {
      queue.push(message);
    }
  }

  function emitFlush() {
    emit({ source, type: toDevtoolsEvents.flush }, false);
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
        eventId: ++journalEventsId,
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
        state: asyncState.currentState,
        config: asyncState.config
      },
    });
    emitAsyncState(asyncState);
  }

  function emitInsideProvider(asyncState, insideProvider = true) {
    emitJournalEvent(asyncState, {
      payload: insideProvider,
      type: devtoolsJournalEvents.insideProvider,
    });
  }

  function emitRunSync(asyncState, props) {
    emitJournalEvent(asyncState, {
      payload: {props, type: "sync"},
      type: devtoolsJournalEvents.run
    });
  }

  function emitReplaceState(asyncState, props) {
    emitJournalEvent(asyncState, {
      payload: {replaceState: true, type: "sync", props},
      type: devtoolsJournalEvents.run
    });
  }

  function emitRunGenerator(asyncState, props) {
    emitJournalEvent(asyncState, {
      payload: {props, type: "generator"},
      type: devtoolsJournalEvents.run
    });
  }

  function emitRunPromise(asyncState, props) {
    emitJournalEvent(asyncState, {
      payload: {props, type: "promise"},
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
    emitAsyncState(asyncState);
  }

  function emitUnsubscription(asyncState, subKey) {
    emitJournalEvent(asyncState, {
      payload: subKey,
      type: devtoolsJournalEvents.unsubscription
    });
    emitAsyncState(asyncState);
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
    emitAsyncState(asyncState);
  }

  function startUpdate(asyncState) {
    currentUpdate = {
      uniqueId: asyncState.uniqueId,
      oldState: shallowClone(asyncState.currentState),
    };
  }
})()
)
;


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

if (__DEV__) {
  function listener(message) {
    if (!message.data || message.data.source !== "async-states-devtools-panel") {
      return;
    }
    console.log('message from devtools', message.data.type, message.data);
    if (message.data) {
      if (message.data.type === devtoolsRequests.init) {
        devtools.connect();
      }
      if (message.data.type === devtoolsRequests.disconnect) {
        devtools.disconnect();
      }
    }
  }

  window && window.addEventListener("message", listener);
}

export default devtools;
