import {
  devtoolsJournalEvents,
  newDevtoolsEvents,
  newDevtoolsRequests,
  toDevtoolsEvents
} from "./eventTypes";
import { __DEV__, shallowClone } from "shared";

let journalEventsId = 0;
const source = "async-states-agent";
const devtools = !__DEV__ ? Object.create(null) : ((function makeDevtools() {

  let keys = {};
  let currentUpdate = null;
  return {
    emitKeys,
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

  function emitKeys() {
    emit({
      source,
      payload: keys,
      type: newDevtoolsEvents.setKeys,
    });
  }

  function emit(message) {
    window && window.postMessage(JSON.parse(JSON.stringify(message)), "*");
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
      uniqueId: asyncState.uniqueId,
      payload: {
        key: asyncState.key,
        journal: asyncState.journal,
        uniqueId: asyncState.uniqueId,
        state: asyncState.currentState,
        lastSuccess: asyncState.lastSuccess,
        subscriptions: Object.keys(asyncState.subscriptions)
      },
      type: newDevtoolsEvents.setAsyncState
    });
  }

  function emitJournalEvent(asyncState, evt) {
    asyncState.journal.push({
      key: asyncState.key,
      eventId: ++journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitPartialSync(uniqueId, evt) {
    emit({
      source,
      payload: evt,
      uniqueId: uniqueId,
      type: newDevtoolsEvents.partialSync,
    });
  }

  function emitCreation(asyncState) {
    keys[`${asyncState.uniqueId}`] = asyncState.key;
    emitKeys();
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
    let evt = {
      payload: {props, type: "sync"},
      type: devtoolsJournalEvents.run
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitReplaceState(asyncState, props) {
    let evt = {
      payload: {replaceState: true, type: "sync", props},
      type: devtoolsJournalEvents.run
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitRunGenerator(asyncState, props) {
    let evt = {
      payload: {props, type: "generator"},
      type: devtoolsJournalEvents.run
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitRunPromise(asyncState, props) {
    let evt = {
      payload: {props, type: "promise"},
      type: devtoolsJournalEvents.run
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
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
    let evt = {
      payload: subKey,
      type: devtoolsJournalEvents.subscription
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitUnsubscription(asyncState, subKey) {
    let evt = {
      payload: subKey,
      type: devtoolsJournalEvents.unsubscription
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitUpdate(asyncState) {
    let evt = {
      payload: {
        oldState: currentUpdate.oldState,
        newState: asyncState.currentState,
        lastSuccess: asyncState.lastSuccess,
      },
      type: devtoolsJournalEvents.update
    };
    emitJournalEvent(asyncState, evt);
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
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
      if (message.data.type === newDevtoolsRequests.getKeys) {
        devtools.emitKeys();
      }
    }
  }

  window && window.addEventListener("message", listener);
}

export default devtools;
