import {createSource, State, ProducerConfig, Status} from "react-async-states";
import {
  DevtoolsEvent,
  DevtoolsJournalEvent
} from "react-async-states/dist/devtools";
import {DevtoolsMessagesBuilder} from "./utils";
import {shimChromeRuntime} from "./ShimChromeRuntime";
import {ProducerProps} from "react-async-states/src";

export function resetAllSources() {
  // currentView.setState(null);
  instancesList.setState({});
  devtoolsInfo.setState({connected: false});
  instanceDetails.setState(null);
  instanceDetails.getAllLanes().forEach(src => src.setState(null));
}

type Info = {
  connected: boolean,
}
export let devtoolsInfo = createSource<Info>("info", devtoolsInfoProducer, {
  hideFromDevtools: true,
  initialValue: {connected: false}
});

function devtoolsInfoProducer(props) {
  let {data: port} = gatewaySource.getState();
  if (!port) {
    throw new Error("Couldn't know port, this is a bug");
  }

  let {dev} = gatewaySource.getPayload();
  port.postMessage(DevtoolsMessagesBuilder.init(dev));
  port.postMessage(DevtoolsMessagesBuilder.getKeys(dev));

  let id = setTimeout(() => {
    props.emit("Timeout", Status.error);
  }, 3000);
  props.onAbort(() => clearTimeout(id));

  return Promise.resolve({connected: false});
}

export type InstanceDetails = {
  key?: string,
  journal?: any[],
  state?: State<any>,
  lastSuccess?: State<any>,
  previousState?: State<any>,
  config?: ProducerConfig<any>,
  subscriptions?: any[],
  cache: any,
}
export let instanceDetails = createSource<InstanceDetails | null>("instance-details", instanceDetailsProducer, {
  initialValue: null,
  hideFromDevtools: true
});

export let currentView = createSource<string | null>("current-view", null, {
  initialValue: null,
  hideFromDevtools: true
});

function instanceDetailsProducer(props: ProducerProps<InstanceDetails | null>) {
  let {data: port} = gatewaySource.getState();
  if (!port) {
    throw new Error("Couldn't know port, this is a bug");
  }

  let {dev} = gatewaySource.getPayload();
  port.postMessage(DevtoolsMessagesBuilder.init(dev));
  port.postMessage(DevtoolsMessagesBuilder.getKeys(dev));

  const {uniqueId} = props.payload;
  port.postMessage?.(DevtoolsMessagesBuilder.getAsyncState(uniqueId, dev));

  return null;
}


export type InstancePlaceholder = { uniqueId: number, key: string, status?: Status, lastUpdate?: number };
export type InstancesList = Record<string, InstancePlaceholder>
export let instancesList = createSource<InstancesList>("instances", null, {
  initialValue: {},
  hideFromDevtools: true
});

// defines the gateway receiving messages from the app
export let gatewaySource = createSource("gateway", gatewayProducer, {hideFromDevtools: true});


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

  port.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    // console.log('received this', message)
    switch (message.type) {
      case DevtoolsEvent.setKeys: {
        devtoolsInfo.setState({connected: true});

        let newKeys = Object.entries(message.payload as Record<number, string>)
          .reduce((acc, [uniqueId, key]) => {
            acc[`${uniqueId}`] = {uniqueId: +uniqueId, key};
            return acc;
          }, {} as InstancesList);

        instancesList.setState(newKeys);
        return;
      }
      case DevtoolsEvent.setAsyncState: {
        instanceDetails.getLaneSource(`${message.uniqueId}`).setState(message.payload);
        return;
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
  let uniqueId = message.uniqueId;
  let currentSource = instanceDetails.getLaneSource(`${uniqueId}`);
  switch (eventType) {
    case DevtoolsJournalEvent.run: {
      let currentDetails = currentSource.getState().data || {} as InstanceDetails;
      currentDetails.journal = ((currentDetails.journal || []).push(message.payload), currentDetails.journal);
      currentSource.setState(currentDetails);
      return;
    }
    case DevtoolsJournalEvent.update: {
      // i want some optimizations by mutating this state here!
      let prevListState = instancesList.getState().data;
      let prevPlaceholder = prevListState[`${uniqueId}`];
      if (!prevPlaceholder) {
        console.warn("received a non managed key", message);
        return;
      }
      prevPlaceholder.lastUpdate = message.payload.eventPayload.newState.timestamp;
      instancesList.setState(prevListState);

      let currentDetails = currentSource.getState().data || {} as InstanceDetails;
      currentDetails.state = message.payload.eventPayload.newState;
      currentDetails.previousState = message.payload.eventPayload.oldState;
      currentDetails.lastSuccess = message.payload.eventPayload.lastSuccess;
      currentDetails.state = message.payload.eventPayload.newState;
      currentDetails.journal = ((currentDetails.journal || []).push(message.payload), currentDetails.journal);

      currentSource.setState(currentDetails);
      return;
    }
    case DevtoolsJournalEvent.subscription: {
      let currentDetails = currentSource.getState().data || {} as InstanceDetails;
      currentDetails.subscriptions = ((currentDetails.subscriptions || []).push(message.payload.eventPayload), currentDetails.subscriptions);
      currentDetails.journal = ((currentDetails.journal || [])?.push(message.payload), currentDetails.journal);

      currentSource.setState(currentDetails);
      return;
    }
    case DevtoolsJournalEvent.unsubscription: {
      let currentDetails = currentSource.getState().data || {} as InstanceDetails;
      currentDetails.subscriptions = ((currentDetails.subscriptions || []).filter(t => t.key !== message.payload.eventPayload));
      currentDetails.journal = ((currentDetails.journal || []).push(message.payload), currentDetails.journal);

      currentSource.setState(currentDetails);
      return;
    }
    default:
      console.warn('received unsupported message', message);
  }
}
