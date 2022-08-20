import {
  createSource,
} from "react-async-states";
import { idsStateInitialValue, journalStateInitialValue } from "./dev-data";
import { devtoolsJournalEvents, newDevtoolsEvents } from "devtools/eventTypes";
import { DevtoolsMessagesBuilder } from "./utils";

const isDev = process.env.NODE_ENV !== "production";

// an update meter to trigger recalculation of the sort
export const updatesMeter = createSource("update-meter", undefined, {initialValue: 0});
// stores data related to any async state
export const journalSource = createSource("journal", undefined);
// defines the gateway receiving messages from the app
export const gatewaySource = createSource("gateway", gatewayProducer);
// stores the keys with unique ids of created states
export const keysSource = createSource("keys", undefined, {initialValue: isDev ? idsStateInitialValue : {}});

// contains the current state unique Id to display, works with lanes
export const currentState = createSource("current-state", undefined);
// the current journal to display from the current displayed state
export const currentJournal = createSource("json", undefined);

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
  }, 10000);
}

function gatewayProducer() {
  const port = window.chrome.runtime.connect({name: "panel"});

  port?.postMessage(DevtoolsMessagesBuilder.init());
  port?.postMessage(DevtoolsMessagesBuilder.getKeys());

  port?.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    console.log('received message', message)
    switch (message.type) {
      case newDevtoolsEvents.setKeys: {
        return keysSource.setState(message.payload);
      }
      case newDevtoolsEvents.setAsyncState: {
        updatesMeter.setState(old => old.data + 1);
        return journalSource.getLaneSource(`${message.uniqueId}`).setState(message.payload);
      }
      case newDevtoolsEvents.partialSync: {
        if (message.payload.eventType === devtoolsJournalEvents.run) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        if (message.payload.eventType === devtoolsJournalEvents.update) {
          updatesMeter.setState(old => old.data + 1);
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                state: message.payload.eventPayload.newState,
                oldState: message.payload.eventPayload.oldState,
                lastSuccess: message.payload.eventPayload.lastSuccess,
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        if (message.payload.eventType === devtoolsJournalEvents.subscription) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                subscriptions: [...old.data.subscriptions, message.payload.eventPayload],
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        if (message.payload.eventType === devtoolsJournalEvents.unsubscription) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                subscriptions: old.data.subscriptions?.filter(t => t !== message.payload.eventPayload),
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        return;
      }
      default:
        return;
    }
  });
  return port;
}
