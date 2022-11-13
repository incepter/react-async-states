import {
  ProducerSavedProps,
  State,
  StateInterface
} from "../async-state";

export enum DevtoolsRequest {
  init = "init",
  getKeys = "get-keys",
  disconnect = "disconnect",
  getAsyncState = "get-async-state",
  changeAsyncState = "change-async-state",
}

export enum DevtoolsEvent {
  setKeys = "set-keys",
  setAsyncState = "set-async-state",
  partialSync = "async-state-partial-sync",
}

export enum DevtoolsJournalEvent {
  run = "run",
  update = "update",
  dispose = "dispose",
  creation = "creation",
  subscription = "subscription",
  unsubscription = "unsubscription",
  insideProvider = "inside-provider",
}

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

  emitRunSync<T>(instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitRunPromise<T>(instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitRunGenerator<T>(
    instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitReplaceState<T>(
    instance: StateInterface<T>, props: ProducerSavedProps<T>): void,

  emitRunConsumedFromCache<T>(
    instance: StateInterface<T>, payload: Record<string, any> | undefined | null,
    args: any[]
  ): void,
}

function createDevtools(): DevtoolsInterface {
  console.log("creating devtools with mode", __DEV__)
  if (!__DEV__) {
    return {} as DevtoolsInterface;
  }

  if (DEVTOOLS) {
    return DEVTOOLS;
  }

  type CurrentUpdate = {
    uniqueId: number,
    oldState: State<any>,
  }

  let keys = {};
  let connected = false;
  let currentUpdate: CurrentUpdate | null = null;
  let retainedInstances = {};

  function listener(message) {
    if (!message.data || message.data.source !== "async-states-devtools-panel") {
      return;
    }
    console.log('message from devtools', message.data.type, message.data);
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
  };

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

  function emitStateInterface(asyncState) {
    if (!asyncState) {
      return;
    }
    retainStateInstance(asyncState);
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
        devModeConfiguration: asyncState.devModeConfiguration,
        subscriptions: asyncState.subscriptions ? Object.keys(asyncState.subscriptions) : [],
        lanes: asyncState.lanes ? Object.keys(asyncState.lanes).map(key => ({
          uniqueId: asyncState.lanes[key].uniqueId,
          key
        })) : [],
        parent: {
          key: asyncState.parent?.key,
          uniqueId: asyncState.parent?.uniqueId
        },
      },
      type: DevtoolsEvent.setAsyncState
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
      type: DevtoolsEvent.partialSync,
    });
  }

  function emitCreation(asyncState) {
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
    // listenToDevtoolsMessages(asyncState);
  }

  function emitInsideProvider(asyncState, insideProvider = true) {
    retainStateInstance(asyncState);
    emitJournalEvent(asyncState, {
      payload: insideProvider,
      type: DevtoolsJournalEvent.insideProvider,
    });
  }

  function emitRunSync(asyncState, props) {
    retainStateInstance(asyncState);
    let evt = {
      payload: {props, type: "sync"},
      type: DevtoolsJournalEvent.run
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

  function emitRunConsumedFromCache(asyncState, payload, execArgs) {
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
    retainStateInstance(asyncState);
    let evt = {
      payload: {replaceState: true, type: "sync", props},
      type: DevtoolsJournalEvent.run
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
    retainStateInstance(asyncState);
    let evt = {
      payload: {props, type: "generator"},
      type: DevtoolsJournalEvent.run
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
    retainStateInstance(asyncState);
    let evt = {
      payload: {props, type: "promise"},
      type: DevtoolsJournalEvent.run
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
        state: asyncState.state,
        lastSuccess: asyncState.lastSuccess
      },
      type: DevtoolsJournalEvent.dispose
    });
    delete retainedInstances[asyncState.uniqueId];
    window && window.removeEventListener("message", retainedInstances[asyncState.uniqueId]?.listener);
  }

  function emitSubscription(asyncState, subKey) {
    retainStateInstance(asyncState);
    let evt = {
      payload: subKey,
      type: DevtoolsJournalEvent.subscription
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

  function emitUpdate(asyncState) {
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

  function startUpdate(asyncState) {
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
    if (!retainedInstances[uniqueId]) {
      console.warn(`Devtools tried to communicate with a non retained state instance with uniqueId ${uniqueId}`);
      return;
    }

    if (message.data.type === "get-async-state") {
      emitStateInterface(retainedInstances[uniqueId]);
    }
    if (message.data.type === "change-async-state") {
      const {data, status, isJson} = message.data;
      const newData = formatData(data, isJson);
      retainedInstances[uniqueId].replaceState(newData, status);
    }
  }

  function retainStateInstance(asyncState) {

    if (retainedInstances.hasOwnProperty(asyncState.uniqueId)) {
      return;
    }

    const {uniqueId} = asyncState;

    retainedInstances[uniqueId] = asyncState;
  }
}

const DEVTOOLS = createDevtools();

export default DEVTOOLS;
