import {ProducerSavedProps, State, StateInterface} from "../async-state";
import {DevtoolsEvent, DevtoolsJournalEvent, DevtoolsRequest} from "./index";
import {humanizeDevFlags} from "../react/utils";
import {
  AsyncStateSubscribeProps,
  StateSubscription
} from "../async-state/AsyncState";

let journalEventsId = 0;
const source = "async-states-agent";
const __DEV__ = process.env.NODE_ENV !== "production";

interface DevtoolsInterface {
  // general
  connect(): void,

  emitKeys(): void,

  disconnect(): void,

  emit(message: any): void,

  formatData(data: any, isJson: boolean),

  // instance specific
  emitUpdate(instance: StateInterface<any>),

  startUpdate(instance: StateInterface<any>),

  emitDispose(instance: StateInterface<any>),

  emitCreation(instance: StateInterface<any>): void,

  emitStateInterface(instance: StateInterface<any>): void,

  emitSubscription(instance: StateInterface<any>, subscriptionKey: string),

  emitUnsubscription(instance: StateInterface<any>, subscriptionKey: string),

  emitRunSync<T>(
    instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitRunPromise<T>(
    instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitRunGenerator<T>(
    instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitReplaceState<T>(
    instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitRunConsumedFromCache<T>(
    instance: StateInterface<T>,
    payload: Record<string, any> | undefined | null,
    args: any[]
  ): void,
}

function createDevtools(): DevtoolsInterface {
  if (!__DEV__) {
    return {} as DevtoolsInterface;
  }

  type CurrentUpdate = {
    uniqueId: number,
    oldState: State<any>,
  }

  let keys = {};
  let connected = false;
  let currentUpdate: CurrentUpdate | null = null;
  let retainedInstances: Record<number, StateInterface<any>> = {};

  function listener(message) {
    if (!message.data || message.data.source !== "async-states-devtools-panel") {
      return;
    }
    if (message.data) {
      if (message.data.type === DevtoolsRequest.init) {
        connect();
        window && window.addEventListener("message", devtoolsInstancesCommandsListener);
      }
      if (message.data.type === DevtoolsRequest.disconnect) {
        disconnect();
        window && window.removeEventListener("message", devtoolsInstancesCommandsListener);
      }
      if (message.data.type === DevtoolsRequest.getKeys) {
        emitKeys();
      }
    }
  }

  window && window.addEventListener("message", listener);

  return {
    emit,
    connect,
    disconnect,
    formatData,
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

    emitStateInterface,

    emitRunConsumedFromCache,
  } as DevtoolsInterface;

  function connect() {
    connected = true;
  }

  function disconnect() {
    connected = false;
  }

  function formatData(data, isJson) {
    if (!isJson) {
      return data;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }

  function emitKeys() {
    if (!connected) {
      return;
    }
    emit({
      source,
      payload: keys,
      type: DevtoolsEvent.setKeys,
    });
  }

  function stringify(val, depth) {
    depth = isNaN(+depth) ? 1 : depth;

    function _build(key, val, depth, o?, a?) { // (JSON.stringify() has it's own rules, which we respect here by using it for property iteration)
      return !val || typeof val !== 'object' ? val : (a = Array.isArray(val), JSON.stringify(val, function (
        k, v) {
        if (a || depth > 0) {
          if (!k) return (a = Array.isArray(v), val = v);
          !o && (o = a ? [] : {});
          o[k] = _build(k, v, a ? depth : depth - 1);
        }
      }), o || (a ? [] : {}));
    }

    return JSON.stringify(_build('', val, depth));
  }


  function serializePayload(payload) {
    return stringify(payload, 10);
  }

  function emit(message) {
    if (!connected || !message || !window) {
      return;
    }
    // only payload may cause issue
    try {
      window.postMessage(JSON.parse(JSON.stringify(message)), "*");
    } catch (e) {
      try {
        window.postMessage({
          ...message,
          payload: JSON.parse(serializePayload(message.payload))
        }, "*");
      } catch (g) {
        window.postMessage({
          source,
          payload: {
            description: "An error occurred while transmitting message to the devtools",
            error: g,
            isError: true,
            eventDate: Date.now(),
            errorString: g.toString?.(),
            eventType: message.payload.type,
            eventId: message.payload.eventId,
          },
          type: message.type,
          uniqueId: message.uniqueId || message.payload.uniqueId,
        }, "*");
      }
    }
  }

  function emitStateInterface(asyncState: StateInterface<any>) {
    if (!asyncState || asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    if (!connected) {
      return;
    }
    emit({
      source,
      uniqueId: asyncState.uniqueId,
      payload: {
        key: asyncState.key,
        cache: asyncState.cache,
        state: asyncState.state,
        config: asyncState.config,
        journal: asyncState.journal,
        uniqueId: asyncState.uniqueId,
        lastSuccess: asyncState.lastSuccess,
        producerType: asyncState.producerType,
        subscriptions: (asyncState.subscriptions ? Object.values(asyncState.subscriptions) : []).map(mapSubscriptionToDevtools),
        lanes: asyncState.lanes ? Object.keys(asyncState.lanes).map(key => ({
          uniqueId: asyncState.lanes![key].uniqueId,
          key
        })) : [],
        parent: asyncState.parent ? {
          key: asyncState.parent?.key,
          uniqueId: asyncState.parent?.uniqueId
        }: null,
      },
      type: DevtoolsEvent.setAsyncState
    });
  }

  function emitJournalEvent(asyncState: StateInterface<any>, evt) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    if (!asyncState.journal) {
      asyncState.journal = [];
    }
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
    if (!connected) {
      return;
    }
    emit({
      source,
      payload: evt,
      uniqueId: uniqueId,
      type: DevtoolsEvent.partialSync,
    });
  }

  function emitCreation(asyncState: StateInterface<any>) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    keys[`${asyncState.uniqueId}`] = asyncState.key;
    emitKeys();
    emitJournalEvent(asyncState, {
      type: DevtoolsJournalEvent.creation,
      payload: {
        state: asyncState.state,
        config: asyncState.config
      },
    });
    emitStateInterface(asyncState);
  }

  function emitRunSync(asyncState: StateInterface<any>, props) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: {props, type: "sync"},
      type: DevtoolsJournalEvent.run
    };

    emitJournalEvent(asyncState, evt);
    if (!connected) {
      return;
    }
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitRunConsumedFromCache(
    asyncState: StateInterface<any>, payload, execArgs) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: {
        consumedFromCache: true,
        type: "sync",
        props: {payload, args: execArgs}
      },
      type: DevtoolsJournalEvent.run
    };
    emitJournalEvent(asyncState, evt);
    if (!connected) {
      return;
    }
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitReplaceState(asyncState: StateInterface<any>, props) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: {replaceState: true, type: "sync", props},
      type: DevtoolsJournalEvent.run
    };
    emitJournalEvent(asyncState, evt);
    if (!connected) {
      return;
    }
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitRunGenerator(asyncState: StateInterface<any>, props) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: {props, type: "generator"},
      type: DevtoolsJournalEvent.run
    };
    emitJournalEvent(asyncState, evt);
    if (!connected) {
      return;
    }
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitRunPromise(asyncState: StateInterface<any>, props) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: {props, type: "promise"},
      type: DevtoolsJournalEvent.run
    };
    emitJournalEvent(asyncState, evt);
    if (!connected) {
      return;
    }
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitDispose(asyncState: StateInterface<any>) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    emitJournalEvent(asyncState, {
      payload: {
        state: asyncState.state,
        lastSuccess: asyncState.lastSuccess
      },
      type: DevtoolsJournalEvent.dispose
    });
    delete retainedInstances[asyncState.uniqueId];
  }

  function emitSubscription(asyncState: StateInterface<any>, subKey) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let subscription = asyncState.subscriptions![subKey];
    let evt = {
      type: DevtoolsJournalEvent.subscription,
      payload: {
        key: subscription.props.key,
        origin: subscription.props.origin,
        flags: subscription.props.flags,
        devFlags: humanizeDevFlags(subscription.props.flags || 0),
      }
    };
    emitJournalEvent(asyncState, evt);
    if (!connected) {
      return;
    }
    emitPartialSync(asyncState.uniqueId, {
      key: asyncState.key,
      eventId: journalEventsId,
      uniqueId: asyncState.uniqueId,

      eventType: evt.type,
      eventDate: Date.now(),
      eventPayload: evt.payload,
    });
  }

  function emitUnsubscription(asyncState: StateInterface<any>, subKey) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: subKey,
      type: DevtoolsJournalEvent.unsubscription
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

  function emitUpdate(asyncState: StateInterface<any>) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let evt = {
      payload: {
        newState: asyncState.state,
        oldState: currentUpdate?.oldState,
        lastSuccess: asyncState.lastSuccess,
      },
      type: DevtoolsJournalEvent.update
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

  function startUpdate(asyncState: StateInterface<any>) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    currentUpdate = {
      uniqueId: asyncState.uniqueId,
      oldState: Object.assign({}, asyncState.state),
    };
  }


  function devtoolsInstancesCommandsListener(message) {
    if (
      !message.data ||
      message.data.source !== "async-states-devtools-panel"
    ) {
      return;
    }
    const uniqueId = message.data.uniqueId;
    if (uniqueId && !retainedInstances[uniqueId]) {
      console.warn(`Devtools tried to communicate with a non retained state instance with uniqueId ${uniqueId}`);
      return;
    }

    if (message.data.type === "get-async-state") {
      emitStateInterface(retainedInstances[uniqueId]);
    }
    if (message.data.type === "change-async-state") {
      const {data, status, isJson} = message.data;
      const newData = formatData(data, isJson);
      retainedInstances[uniqueId].setState(newData, status);
    }
  }

  function retainStateInstance(asyncState: StateInterface<any>) {
    if (asyncState.config.hideFromDevtools) {
      return;
    }

    if (retainedInstances.hasOwnProperty(asyncState.uniqueId)) {
      return;
    }

    const {uniqueId} = asyncState;

    retainedInstances[uniqueId] = asyncState;
  }
}

function mapSubscriptionToDevtools(sub: StateSubscription<any>) {
  return {
    key: sub.props.key,
    flags: sub.props.flags,
    origin: getSubscriptionOrigin(sub.props.origin),
    devFlags: humanizeDevFlags(sub.props.flags || 0),
  }
}

function getSubscriptionOrigin(origin?: number) {
  switch (origin) {
    case 1:
      return "useAsyncState";
    case 2:
      return "useSource";
    case 3:
      return "useProducer";
    case 4:
      return "useSelector";
    case undefined:
      return "undefined";
    default:
      return "unknown";
  }
}

let DEVTOOLS = createDevtools();

export default DEVTOOLS;
