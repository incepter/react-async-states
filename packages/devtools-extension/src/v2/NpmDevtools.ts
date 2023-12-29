import type { DevtoolsAgent, StateInterface, Status } from "async-states";
import { AsyncState, devtools } from "async-states";
import { devtoolsSubscriptionKey } from "./constants";

export type SingleInstanceInfo = {
  id: number;
  key: string;
  status: Status;
  subCount: number;
  disposed: boolean;
};

export type AnyInstance = StateInterface<any, any, any>;
export type InstancesInfo = Record<number, SingleInstanceInfo>;

export interface NpmDevtoolsAgent extends DevtoolsAgent {
  readonly ids: Record<number, AnyInstance>;
  readonly info: StateInterface<InstancesInfo, never, Error>;
  readonly current: StateInterface<AnyInstance | null, never, Error>;

  setCurrentInstance(instanceId: number): void;
}

export class NpmLibraryDevtoolsClient implements NpmDevtoolsAgent {
  // on creation, we will retain the created instance, only if connected
  // if not connected and the devtools comes in after many instances were
  // created, there is a chance they won't be visible until an event occurs
  // to them.
  readonly ids: Record<number, AnyInstance> = {};

  // to represent the UI for the devtools, we would need the following states:
  // - the sidebar representation: the id, key, current status, ctx and count
  //   of subscribers in a given state instance. we'll group all of them into a
  //   single state initially. If this becomes irrelevant, we'll split them
  // - the currently displayed state instance

  readonly info: StateInterface<InstancesInfo, never, Error>;
  readonly current: StateInterface<AnyInstance | null, never, Error>;

  private currentUpdatePreviousState: any = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.emitRun = this.emitRun.bind(this);
    this.emitSub = this.emitSub.bind(this);
    this.emitUnsub = this.emitUnsub.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emitUpdate = this.emitUpdate.bind(this);
    this.updateInfo = this.updateInfo.bind(this);
    this.startUpdate = this.startUpdate.bind(this);
    this.emitDispose = this.emitDispose.bind(this);
    this.emitCreation = this.emitCreation.bind(this);
    this.emitInstance = this.emitInstance.bind(this);
    this.setCurrentInstance = this.setCurrentInstance.bind(this);
    this.ensureInstanceIsRetained = this.ensureInstanceIsRetained.bind(this);
    this.info = new AsyncState("devtools-states-info", null, {
      initialValue: {},
      storeInContext: false,
      hideFromDevtools: true,
    });
    this.current = new AsyncState("devtools-current-instance", null, {
      initialValue: null,
      storeInContext: false,
      hideFromDevtools: true,
    });
  }

  connect(): void {
    devtools.connect(this);
  }

  disconnect(): void {
    devtools.disconnect(this);
    // reset everything
    this.info.actions.setData({});
  }

  emitCreation(instance: AnyInstance): void {
    if (instance.config.storeInContext !== false) {
      this.ensureInstanceIsRetained(instance);
    }
  }

  emitDispose(instance: AnyInstance): void {
    let id = instance.id;
    if (!this.ids[id]) {
      return;
    }
    delete this.ids[id];
    this.updateInfo(id, "disposed", true);
  }

  emitInstance(instance: AnyInstance): void {
    this.ensureInstanceIsRetained(instance);
  }

  emitRun(instance: AnyInstance, cache: boolean): void {
    this.ensureInstanceIsRetained(instance);
    let latestRun = instance.latestRun!;
    addToJournal(instance, {
      at: Date.now(),
      type: "run",
      payload: {
        cache,
        args: latestRun.args,
        payload: latestRun.payload,
      },
    });
  }

  emitSub(instance: AnyInstance, key: string): void {
    this.ensureInstanceIsRetained(instance);
    addToJournal(instance, {
      at: Date.now(),
      payload: key,
      type: "subscription",
    });

    let currentSubscriptionsCount = countSubscriptions(instance);
    this.updateInfo(instance.id, "subCount", currentSubscriptionsCount);
  }

  emitUnsub(instance: AnyInstance, key: string): void {
    let subCount = countSubscriptions(instance);

    // when the instance is standalone and there is no more subscriptions
    // we remove it from the info and from the ids
    if (subCount === 0 && instance.config.storeInContext === false) {
      this.info.actions.setData((prev) => {
        let prevData = { ...prev! };
        delete prevData[instance.id];
        return prevData;
      });
      if (this.current.lastSuccess.data === instance) {
        this.current.actions.setData(null);
      }
    } else {
      this.ensureInstanceIsRetained(instance);
      addToJournal(instance, {
        at: Date.now(),
        payload: key,
        type: "unsubscription",
      });
      this.updateInfo(instance.id, "subCount", subCount);
    }
  }

  startUpdate(instance: AnyInstance): void {
    this.ensureInstanceIsRetained(instance);
    this.currentUpdatePreviousState = instance.state;
  }

  emitUpdate(instance: AnyInstance, replace: boolean): void {
    this.ensureInstanceIsRetained(instance);
    let nextState = instance.state;
    let previousState = this.currentUpdatePreviousState;

    addToJournal(instance, {
      at: Date.now(),
      type: "update",
      payload: {
        replace,
        prev: previousState,
        next: instance.state,
      },
    });
    this.currentUpdatePreviousState = null;

    let nextStatus = nextState.status;
    let currentData = this.info.lastSuccess.data!;
    let currentInstanceInfo = currentData[instance.id];
    if (currentInstanceInfo.status !== nextStatus) {
      this.updateInfo(instance.id, "status", nextStatus);
    }
  }

  onConnect(instances: AnyInstance[]): void {
    let newData: Record<number, SingleInstanceInfo> = {};
    for (let instance of instances) {
      if (instance.config.hideFromDevtools) {
        continue;
      }
      let id = instance.id;
      if (!this.ids[id]) {
        this.ids[id] = instance;
      }
      let subCount = countSubscriptions(instance);
      newData[id] = {
        id: id,
        key: instance.key,
        status: instance.state.status,
        subCount,
        disposed: false,
      };
    }

    this.info.actions.setData(newData);
  }

  captureContext() {
    throw new Error("The devtools client doesn't have captureContext.");
  }

  releaseContext() {
    throw new Error("The devtools client doesn't have releaseContext.");
  }

  setCurrentInstance(instanceId: number): void {
    let instance = this.ids[instanceId];
    if (instance) {
      this.current.actions.setData(instance);
    } else {
      console.log(`Couldn't find instance with id ${instanceId}`);
    }
  }

  private ensureInstanceIsRetained(instance: AnyInstance) {
    this.ids[instance.id] = instance;
    let currentData = this.info.lastSuccess.data!;

    if (!currentData[instance.id]) {
      this.info.actions.setData((prev) => {
        let prevData = prev!;
        let subCount = countSubscriptions(instance);
        return {
          ...prevData,
          [instance.id]: {
            subCount,
            disposed: false,
            id: instance.id,
            key: instance.key,
            status: instance.state.status,
          },
        };
      });
    } else {
      let currentInstanceInfo = currentData[instance.id];
      if (currentInstanceInfo.disposed) {
        this.updateInfo(instance.id, "disposed", false);
      }
    }
  }
  private updateInfo<Prop extends keyof SingleInstanceInfo>(
    id: number,
    prop: Prop,
    value: SingleInstanceInfo[Prop]
  ) {
    this.info.actions.setData((prev) => {
      // the initialValue guarantees this
      let prevInfo = prev!;

      if (!prevInfo[id]) {
        return prevInfo;
      }

      let nextAllInstancesInfo = { ...prev! };
      let nextInstanceInfo = { ...nextAllInstancesInfo[id]! };
      nextInstanceInfo[prop] = value;
      nextAllInstancesInfo[id] = nextInstanceInfo;

      return nextAllInstancesInfo;
    });
  }
}
type JournalEvent = {
  // the timestamp
  at: number;

  // the tracked journal events
  type:
    | "run"
    | "update"
    | "dispose"
    | "creation"
    | "subscription"
    | "unsubscription";

  // can be anything, but we do this:
  // run: args and payload
  // update: prev and next states and whether is was taken from cache
  // dispose: state (was it initial ?)
  // sub: sub key
  // unsub: sub key
  payload: any;
};

function countSubscriptions(instance: AnyInstance) {
  let subscriptions = instance.subscriptions;
  if (!subscriptions) {
    return 0;
  }
  let subKeys = Object.keys(subscriptions);
  let subCount = subKeys.length;

  if (subKeys.some((t) => t.startsWith(devtoolsSubscriptionKey))) {
    return subCount - 1;
  }

  return subCount;
}

function addToJournal(instance: AnyInstance, event: JournalEvent) {
  if (!instance.journal) {
    instance.journal = [];
  }
  instance.journal.push(event);
}
