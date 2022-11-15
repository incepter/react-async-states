import {
  createSource,
} from "react-async-states";
import {
  DevtoolsEvent,
  DevtoolsJournalEvent
} from "react-async-states/dist/devtools";
import {DevtoolsMessagesBuilder} from "./utils";

const isDev = process.env.NODE_ENV !== "production";

// an update meter to trigger recalculation of the sort
export const updatesMeter = createSource("update-meter", undefined, {initialValue: 0});

type Journal = { key: string, journal: any[], subscriptions: string[] };
// stores data related to any async state
export const journalSource = createSource<Journal>("journal");
// defines the gateway receiving messages from the app
export const gatewaySource = createSource("gateway", gatewayProducer);
// stores the keys with unique ids of created states
export const keysSource = createSource("keys", undefined, {initialValue: {}});

// contains the current state unique Id to display, works with lanes
export const currentState = createSource<string | null>("current-state");

type CurrentJournal = { name: string, uniqueId: number, eventId: number, data: any };
// the current journal to display from the current displayed state
export const currentJournal = createSource<CurrentJournal | null>("json");

let systemSourcesIds;

if (isDev) {
  systemSourcesIds = {
    [updatesMeter.uniqueId]: updatesMeter.key,
    [journalSource.uniqueId]: journalSource.key,
    [gatewaySource.uniqueId]: gatewaySource.key,
    [keysSource.uniqueId]: keysSource.key,
    [currentState.uniqueId]: currentState.key,
    [currentJournal.uniqueId]: currentJournal.key,
  }
}

setTimeout(() => {
  let shape = {};
  Object
    .keys(keysSource.getState().data ?? {})
    .forEach(id => {
      shape[id] = journalSource.getLaneSource(`${id}`).getState().data
    });
  console.log('_______ state of all ________________');

  console.log(shape);

  console.log('______________________ keys ___________________');
  console.log(keysSource.getState());
}, 20000);

function gatewayProducer(props) {
  const port = (window as any).chrome.runtime.connect({name: "panel"});

  console.log('received port is', port);
  if (!port) {
    throw new Error('Cannot get port object');
  }

  port.postMessage(DevtoolsMessagesBuilder.init());
  port.postMessage(DevtoolsMessagesBuilder.getKeys());

  props.onAbort(() => port.onDisconnect());

  port.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    if (isDev) {
      let uniqueId = +(message.uniqueId || message.payload?.uniqueId);
      if (systemSourcesIds.hasOwnProperty(uniqueId) || systemSourcesIds.hasOwnProperty(`${uniqueId}`)) {
        console.log('received message about system stuff, ignoring them!')
      } else {
        console.log('====', message)
      }
    }
    switch (message.type) {
      case DevtoolsEvent.setKeys: {
        const nextKeys = !isDev ? message.payload :
          Object.entries(message.payload)
            .filter(([t]) => !systemSourcesIds.hasOwnProperty(t))
            .reduce((acc, curr) => (acc[curr[0]] = curr[1], acc), {});

        console.log('setKeys', nextKeys);
        return keysSource.setState(nextKeys);
      }
      case DevtoolsEvent.setAsyncState: {
        console.log('setAsyncState', message)
        updatesMeter.setState(old => old.data + 1);
        return // journalSource.getLaneSource(`${message.uniqueId}`).setState(message.payload);
      }
      case DevtoolsEvent.partialSync: {
        console.log('partialSync', message.payload)
        // applyPartialUpdate(message);
        return;
      }
      default:
        return;
    }
  });
  return port;
}

function applyPartialUpdate(message) {
  const {eventType} = message.payload;
  switch (eventType) {
    case DevtoolsJournalEvent.run: {
      journalSource.getLaneSource(`${message.uniqueId}`).setState(old => {
        return {
          ...old.data,
          journal: [...old.data.journal, message.payload],
        }
      });
      return;
    }
    case DevtoolsJournalEvent.update: {
      updatesMeter.setState(old => old.data + 1);
      journalSource.getLaneSource(`${message.uniqueId}`).setState(old => {
        return {
          ...old.data,
          state: message.payload.eventPayload.newState,
          oldState: message.payload.eventPayload.oldState,
          lastSuccess: message.payload.eventPayload.lastSuccess,
          journal: [...old.data.journal, message.payload],
        }
      });
      return;
    }
    case DevtoolsJournalEvent.subscription: {
      journalSource.getLaneSource(`${message.uniqueId}`).setState(old => {
        return {
          ...old.data,
          subscriptions: [...old.data.subscriptions, message.payload.eventPayload],
          journal: [...old.data.journal, message.payload],
        }
      });
      return;
    }
    case DevtoolsJournalEvent.unsubscription: {
      journalSource.getLaneSource(`${message.uniqueId}`).setState(old => {
        return {
          ...old.data,
          subscriptions: old.data.subscriptions?.filter(t => t !== message.payload.eventPayload),
          journal: [...old.data.journal, message.payload],
        }
      });
      return;
    }
    default:
      console.warn('received unsupported message', message);
  }
}
