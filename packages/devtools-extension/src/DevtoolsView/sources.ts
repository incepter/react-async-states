import {
  createSource,
} from "react-async-states";
import {idsStateInitialValue, journalStateInitialValue} from "./dev-data";
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
export const journalSource = createSource<Journal>("journal", undefined);
// defines the gateway receiving messages from the app
export const gatewaySource = createSource("gateway", gatewayProducer);
// stores the keys with unique ids of created states
export const keysSource = createSource("keys", undefined, {initialValue: isDev ? idsStateInitialValue : {}});

// contains the current state unique Id to display, works with lanes
export const currentState = createSource<string | null>("current-state", undefined);

type CurrentJournal = { name: string, uniqueId: number, eventId: number, data: any };
// the current journal to display from the current displayed state
export const currentJournal = createSource<CurrentJournal | null>("json", undefined);

if (isDev) {
  Object
    .keys(keysSource.getState().data ?? {})
    .forEach(id => {
      journalSource.getLaneSource(`${id}`).setState(
        journalStateInitialValue[`${id}`] ?? {
          data: null,
          messages: []
        }
      );
    });
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

function gatewayProducer() {
  const port = (window as any).chrome.runtime.connect({name: "panel"});

  port?.postMessage(DevtoolsMessagesBuilder.init());
  port?.postMessage(DevtoolsMessagesBuilder.getKeys());

  port?.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    switch (message.type) {
      case DevtoolsEvent.setKeys: {
        return keysSource.setState(message.payload);
      }
      case DevtoolsEvent.setAsyncState: {
        console.log('received an async state', message);
        updatesMeter.setState(old => old.data + 1);
        return journalSource.getLaneSource(`${message.uniqueId}`).setState(message.payload);
      }
      case DevtoolsEvent.partialSync: {
        applyPartialUpdate(message);
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
