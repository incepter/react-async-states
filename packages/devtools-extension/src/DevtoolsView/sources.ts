import {createSource, State,} from "react-async-states";
import {
  DevtoolsEvent,
  DevtoolsJournalEvent
} from "react-async-states/dist/devtools";
import {DevtoolsMessagesBuilder} from "./utils";
import {shimChromeRuntime} from "./ShimChromeRuntime";

// an update meter to trigger recalculation of the sort
export const updatesMeter = createSource("update-meter", undefined, {
  initialValue: 0,
  hideFromDevtools: true
});

type Journal = {
  key: string,
  journal: any[],
  state: State<any>,
  subscriptions: string[]
};
// stores data related to any async state
export const journalSource = createSource<Journal>("journal", null, {hideFromDevtools: true});
// defines the gateway receiving messages from the app
export const gatewaySource = createSource("gateway", gatewayProducer, {hideFromDevtools: true});
// stores the keys with unique ids of created states
export const keysSource = createSource("keys", undefined, {
  initialValue: {},
  hideFromDevtools: true
});

// contains the current state unique Id to display, works with lanes
export const currentState = createSource<string | null>("current-state", null, {hideFromDevtools: true});

type CurrentJournal = { name: string, uniqueId: number, eventId: number, data: any };
// the current journal to display from the current displayed state
export const currentJournal = createSource<CurrentJournal | null>("json", null, {hideFromDevtools: true});

export function resetAllSources() {
  keysSource.setState({});
  currentState.setState(null);
  currentJournal.setState(null);
  // @ts-ignore
  journalSource.setState(undefined);
}


export function getPort(isDevMode) {
  if (isDevMode) {
    let shim = shimChromeRuntime();
    if (shim) {
      // @ts-ignore
      window.chrome = shim;
    }
    return shim.runtime.connect({name: "panel"});
  }
  return (window as any).chrome.runtime.connect({name: "panel"});
}

function gatewayProducer(props) {
  const {dev} = props.payload;
  const port = getPort(dev);

  if (!port) {
    throw new Error('Cannot get port object');
  }

  port.postMessage(DevtoolsMessagesBuilder.init(dev));
  port.postMessage(DevtoolsMessagesBuilder.getKeys(dev));

  port.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    switch (message.type) {
      case DevtoolsEvent.setKeys: {
        return keysSource.setState(message.payload);
      }
      case DevtoolsEvent.setAsyncState: {
        updatesMeter.setState(old => old.data + 1);
        journalSource.getLaneSource(`${message.uniqueId}`).setState(message.payload);
        return ;
      }
      case DevtoolsEvent.partialSync: {
        applyPartialUpdate(message);
        return;
      }
      default:
        return;
    }

  });

  props.onAbort(() => port.onDisconnect());

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
        let prevData = old.data ?? {};
        return {
          ...prevData,
          subscriptions: [...(prevData.subscriptions ?? []), message.payload.eventPayload],
          journal: [...(prevData.journal ?? []), message.payload],
        }
      });
      return;
    }
    case DevtoolsJournalEvent.unsubscription: {
      journalSource.getLaneSource(`${message.uniqueId}`).setState(old => {
        let prevData = old.data ?? {};
        return {
          ...prevData,
          subscriptions: (prevData.subscriptions ?? [])?.filter(t => t !== message.payload.eventPayload),
          journal: [...(prevData.journal ?? []), message.payload],
        }
      });
      return;
    }
    default:
      console.warn('received unsupported message', message);
  }
}
