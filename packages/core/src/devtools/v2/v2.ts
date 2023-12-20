import { StateInterface } from "../../types";
import { __DEV__ } from "../../utils";

export type AnyInstance = StateInterface<any, any, any>;
export interface DevtoolsAgent {
	// called when new AsyncState constructor is called
	emitCreation(instance: AnyInstance): void;
	// called when the dispose function is called (subscriptions = 0)
	emitDispose(instance: AnyInstance): void;

	// called when the devtools client requests a full refresh about an instance
	emitInstance(instance: AnyInstance): void;
	// when replace state is being called to collect to previous state
	startUpdate(instance: AnyInstance): void;
	// when the replaceState finished to send both prev and next states
	emitUpdate(instance: AnyInstance, replace: boolean): void;

	// called when run occurs, cache is whether it was consumed from cache
	emitRun(instance: AnyInstance, cache: boolean): void;
	// when a subscriber subscribes
	emitSub(instance: AnyInstance, subscriptionKey: string): void;
	// when a subscriber unsubscribes
	emitUnsub(instance: AnyInstance, subscriptionKey: string): void;

	// when a client connects, it should provide an "emit" function
	// when it s the npm package, it is the notify function
	// when it is the devtools extension, it should be a wrapper around
	//      window.postMessage.
	connect(listener: DevtoolsAgent): void;
	// will disconnect the connected listener
	disconnect(listener: DevtoolsAgent): void;
}

class LibraryDevtools implements DevtoolsAgent {
	// the list of connected devtools clients, can be the npm package,
	// the devtools extension, or both for example
	private listeners: DevtoolsAgent[] = [];

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
	}
	connect(listener: DevtoolsAgent): void {
		this.listeners.push(listener);
	}

	disconnect(listener: DevtoolsAgent): void {
		this.listeners = this.listeners.filter((t) => t !== listener);
	}

	emitCreation(instance: AnyInstance): void {
		this.listeners.forEach((listener) => listener.emitCreation(instance));
	}

	emitDispose(instance: AnyInstance): void {
		this.listeners.forEach((listener) => listener.emitDispose(instance));
	}

	emitInstance(instance: AnyInstance): void {
		this.listeners.forEach((listener) => listener.emitInstance(instance));
	}

	emitRun(instance: AnyInstance, cache: boolean): void {
		this.listeners.forEach((listener) => listener.emitRun(instance, cache));
	}

	emitSub(instance: AnyInstance, key: string): void {
		this.listeners.forEach((listener) => listener.emitSub(instance, key));
	}

	emitUnsub(instance: AnyInstance, key: string): void {
		this.listeners.forEach((listener) => listener.emitUnsub(instance, key));
	}

	startUpdate(instance: AnyInstance): void {
		this.listeners.forEach((listener) => listener.startUpdate(instance));
	}

	emitUpdate(instance: AnyInstance, replace: boolean): void {
		this.listeners.forEach((listener) =>
			listener.emitUpdate(instance, replace)
		);
	}
}

export let devtools: DevtoolsAgent;
if (__DEV__) {
	devtools = new LibraryDevtools();
}
