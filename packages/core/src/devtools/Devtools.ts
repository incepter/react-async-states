import {ProducerSavedProps, State, StateInterface} from "..";
import {DevtoolsEvent, DevtoolsJournalEvent, DevtoolsRequest} from "./index";
import {StateSubscription} from "../types";
import {isServer, maybeWindow} from "../utils";

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
  emitUpdate(instance: StateInterface<unknown, unknown, unknown, unknown[]>),

  startUpdate(instance: StateInterface<unknown, unknown, unknown, unknown[]>),

  emitDispose(instance: StateInterface<unknown, unknown, unknown, unknown[]>),

  emitCreation(instance: StateInterface<unknown, unknown, unknown, unknown[]>): void,

  emitStateInterface(instance: StateInterface<unknown, unknown, unknown, unknown[]>): void,

  emitSubscription(
    instance: StateInterface<unknown, unknown, unknown, unknown[]>, subscriptionKey: string),

  emitUnsubscription(
    instance: StateInterface<unknown, unknown, unknown, unknown[]>, subscriptionKey: string),

  emitRunSync<T, E, R, A extends unknown[]>(
    instance: StateInterface<T, E, R, A>, props: ProducerSavedProps<T, A>): void,

  emitRunPromise<T, E, R, A extends unknown[]>(
    instance: StateInterface<T, E, R, A>, props: ProducerSavedProps<T, A>): void,

  emitRunGenerator<T, E, R, A extends unknown[]>(
    instance: StateInterface<T, E, R, A>, props: ProducerSavedProps<T, A>): void,

  emitReplaceState<T, E, R, A extends unknown[]>(
    instance: StateInterface<T, E, R, A>, props: ProducerSavedProps<T, A>): void,

  emitRunConsumedFromCache<T, E, R, A extends unknown[]>(
    instance: StateInterface<T, E, R, A>,
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
    oldState: State<unknown, unknown, unknown, unknown[]>,
  }

  let keys = {};
  let connected = false;
  let currentUpdate: CurrentUpdate | null = null;
  let retainedInstances: Record<number, StateInterface<unknown, unknown, unknown, unknown[]>> = {};

  function listener(message) {
    if (isServer) {
      return;
    }
    if (!message.data || message.data.source !== "async-states-devtools-panel") {
      return;
    }
    if (message.data) {
      if (message.data.type === DevtoolsRequest.init) {
        connect();
        maybeWindow && maybeWindow.addEventListener("message", devtoolsInstancesCommandsListener);
      }
      if (message.data.type === DevtoolsRequest.disconnect) {
        disconnect();
        maybeWindow && maybeWindow.removeEventListener("message", devtoolsInstancesCommandsListener);
      }
      if (message.data.type === DevtoolsRequest.getKeys) {
        emitKeys();
      }
    }
  }

  if (!isServer) {
    maybeWindow && maybeWindow.addEventListener("message", listener);
  }

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
    if (!connected || isServer) {
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
    if (!connected || !message || isServer) {
      return;
    }
    // only payload may cause issue
    try {
      maybeWindow!.postMessage(JSON.parse(JSON.stringify(message)), "*");
    } catch (e) {
      try {
        maybeWindow!.postMessage({
          ...message,
          payload: JSON.parse(serializePayload(message.payload))
        }, "*");
      } catch (g) {
        maybeWindow!.postMessage({
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

  function emitStateInterface(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>) {
    if (isServer || !asyncState || asyncState.config.hideFromDevtools) {
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
        pool: asyncState.pool.simpleName,
        lastSuccess: asyncState.lastSuccess,
        subscriptions: (asyncState.subscriptions ? Object.values(asyncState.subscriptions) : []).map(mapSubscriptionToDevtools),
        lanes: asyncState.lanes ? Object.keys(asyncState.lanes).map(key => ({
          uniqueId: asyncState.lanes![key].uniqueId,
          key
        })) : [],
        parent: asyncState.parent ? {
          key: asyncState.parent?.key,
          uniqueId: asyncState.parent?.uniqueId
        } : null,
      },
      type: DevtoolsEvent.setAsyncState
    });
  }

  function emitJournalEvent(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, evt) {
    if (isServer || asyncState.config.hideFromDevtools) {
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
    if (isServer || !connected) {
      return;
    }
    emit({
      source,
      payload: evt,
      uniqueId: uniqueId,
      type: DevtoolsEvent.partialSync,
    });
  }

  function emitCreation(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitRunSync(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, props) {
    if (isServer || asyncState.config.hideFromDevtools) {
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
    asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, payload, execArgs) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitReplaceState(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, props) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitRunGenerator(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, props) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitRunPromise(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, props) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitDispose(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitSubscription(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, subKey) {
    if (isServer || asyncState.config.hideFromDevtools) {
      return;
    }
    retainStateInstance(asyncState);
    let subscription = asyncState.subscriptions![subKey];
    let evt = {
      type: DevtoolsJournalEvent.subscription,
      payload: {
        key: subscription.props.key,
        flags: subscription.props.flags,
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

  function emitUnsubscription(
    asyncState: StateInterface<unknown, unknown, unknown, unknown[]>, subKey) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function emitUpdate(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>) {
    if (isServer || asyncState.config.hideFromDevtools) {
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

  function startUpdate(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>) {
    if (isServer || asyncState.config.hideFromDevtools) {
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
      isServer ||
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

  function retainStateInstance(asyncState: StateInterface<unknown, unknown, unknown, unknown[]>) {
    if (isServer || asyncState.config.hideFromDevtools) {
      return;
    }

    if (retainedInstances.hasOwnProperty(asyncState.uniqueId)) {
      return;
    }

    const {uniqueId} = asyncState;

    retainedInstances[uniqueId] = asyncState;
  }
}

function mapSubscriptionToDevtools(sub: StateSubscription<unknown, unknown, unknown, unknown[]>) {
  return {
    key: sub.props.key,
    flags: sub.props.flags,
    // devFlags: mapFlags(sub.props.flags || 0),
  }
}

function getSubscriptionOrigin(origin?: number) {
  switch (`${origin}`) {
    case "1":
      return "useAsyncState";
    case "2":
      return "useSource";
    case "3":
      return "useProducer";
    case "4":
      return "useSelector";
    case undefined:
      return "undefined";
    default:
      return "unknown";
  }
}

let DEVTOOLS = createDevtools();

export default DEVTOOLS;
