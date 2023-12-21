import { devtools } from "async-states/dist/es/src/devtools/v2/v2";
import type {
	AnyInstance,
	DevtoolsAgent,
} from "async-states/dist/es/src/devtools/v2/v2";
import type { Status } from "async-states/dist/es/src/enums";
import type { StateInterface } from "async-states/dist/es/types";
import { AsyncState } from "async-states/dist/es/src/AsyncState";

export type SingleInstanceInfo = {
	id: number;
	key: string;
	context: any;
	status: Status;
	subCount: number;
	disposed: boolean;
};

export type InstancesInfo = Record<number, SingleInstanceInfo>;

interface NpmDevtoolsAgent extends DevtoolsAgent {
	readonly info: StateInterface<InstancesInfo, never, Error>;
}

export class NpmLibraryDevtoolsClient implements NpmDevtoolsAgent {
	// on creation, we will retain the created instance, only if connected
	// if not connected and the devtools comes in after many instances were
	// created, there is a chance they won't be visible until an event occurs
	// to them.
	// on dispose, always remove the state, the client can then either remove
	// it entirely or mark is as disposed/removed
	private readonly ids: Record<number, AnyInstance> = {};

	// to represent the UI for the devtools, we would need the following states:
	// - the sidebar representation: the id, key, current status, ctx and count
	//   of subscribers in a given state instance. we'll group all of them into a
	//   single state initially. If this becomes irrelevant, we'll split them
	// - the currently displayed state

	readonly info: StateInterface<InstancesInfo, never, Error>;

	private currentUpdatePreviousState: any = null;

	constructor() {
		this.connect = this.connect.bind(this);
		this.disconnect = this.disconnect.bind(this);
		this.emitCreation = this.emitCreation.bind(this);
		this.emitDispose = this.emitDispose.bind(this);
		this.emitInstance = this.emitInstance.bind(this);
		this.emitRun = this.emitRun.bind(this);
		this.emitSub = this.emitSub.bind(this);
		this.emitUnsub = this.emitUnsub.bind(this);
		this.startUpdate = this.startUpdate.bind(this);
		this.emitUpdate = this.emitUpdate.bind(this);
		this.ensureInstanceIsRetained = this.ensureInstanceIsRetained.bind(this);
		this.updateInfo = this.updateInfo.bind(this);
		this.info = new AsyncState("devtools-states-info", null, {
			initialValue: {},
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
		// this.info.actions.setData({});
	}

	emitCreation(instance: AnyInstance): void {
		this.ensureInstanceIsRetained(instance);
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

		let currentSubscriptionsCount = Object.keys(instance.subscriptions!).length;
		this.updateInfo(instance.id, "subCount", currentSubscriptionsCount);
	}

	emitUnsub(instance: AnyInstance, key: string): void {
		this.ensureInstanceIsRetained(instance);
		addToJournal(instance, {
			at: Date.now(),
			payload: key,
			type: "unsubscription",
		});

		let currentSubscriptionsCount = Object.keys(instance.subscriptions!).length;
		this.updateInfo(instance.id, "subCount", currentSubscriptionsCount);
	}

	startUpdate(instance: AnyInstance): void {
		this.ensureInstanceIsRetained(instance);
		this.currentUpdatePreviousState = instance.state;
	}

	emitUpdate(instance: AnyInstance, replace: boolean): void {
		// console.log("received update", instance.id, this.ids);
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

	private ensureInstanceIsRetained(instance: AnyInstance) {
		this.ids[instance.id] = instance;
		let currentData = this.info.lastSuccess.data!;
		// console.log("ensuring", instance.id, currentData);

		if (!currentData[instance.id]) {
			this.info.actions.setData((prev) => {
				let prevData = prev!;

				let subCount = 0;
				if (instance.subscriptions) {
					subCount = Object.keys(instance.subscriptions).length;
				}
				return {
					...prevData,
					[instance.id]: {
						subCount,
						disposed: false,
						id: instance.id,
						key: instance.key,
						context: String(instance.ctx),
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

function addToJournal(instance: AnyInstance, event: JournalEvent) {
	if (!instance.journal) {
		instance.journal = [];
	}
	instance.journal.push(event);
}