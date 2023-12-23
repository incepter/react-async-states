import { LibraryContext, StateInterface } from "../../types";
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

	// when a Context is created
	captureContext(context: LibraryContext): void;
	// when a Context is released via terminateContext
	releaseContext(context: LibraryContext): void;

	// when a client connects, it should provide an "emit" function
	// when it s the npm package, it is the notify function
	// when it is the devtools extension, it should be a wrapper around
	//      window.postMessage.
	connect(listener: DevtoolsAgent): void;
	// will disconnect the connected listener
	disconnect(listener: DevtoolsAgent): void;
	onConnect(currentInstances: AnyInstance[]): void;
}

class LibraryDevtools implements DevtoolsAgent {
	// the list of connected devtools clients, can be the npm package,
	// the devtools extension, or both for example
	private listeners: DevtoolsAgent[] = [];

	// on connection from a client, we will give it the list of created
	// LibraryContexts that hold all instances that are created.
	// standalone instances and not stored in context will be gathered too
	// in a separate map, and on dispose they will be removed
	// this is relevant only on connection to give the full list of current
	// instances, after connexion, there is no need because the event
	// gives the instance itself and client should ensure instance is retained
	private readonly standalone: Set<AnyInstance> = new Set<AnyInstance>();
	private readonly contexts: Set<LibraryContext> = new Set<LibraryContext>();

	constructor() {
		this.connect = this.connect.bind(this);
		this.emitRun = this.emitRun.bind(this);
		this.emitSub = this.emitSub.bind(this);
		this.emitUnsub = this.emitUnsub.bind(this);
		this.emitUpdate = this.emitUpdate.bind(this);
		this.disconnect = this.disconnect.bind(this);
		this.startUpdate = this.startUpdate.bind(this);
		this.emitDispose = this.emitDispose.bind(this);
		this.emitCreation = this.emitCreation.bind(this);
		this.emitInstance = this.emitInstance.bind(this);
		this.captureContext = this.captureContext.bind(this);
		this.releaseContext = this.releaseContext.bind(this);
		this.ensureInstanceIsRetained = this.ensureInstanceIsRetained.bind(this);
	}

	connect(listener: DevtoolsAgent): void {
		this.listeners.push(listener);

		// on any connection of any client, we give him the currently retained
		// instances. All of them. The list include:
		// - Any instance in any non-terminated LibraryContext
		// - Any active 'standalone' instance
		let instances: AnyInstance[] = [...this.standalone];
		for (let context of this.contexts) {
			instances.push(...context.getAll());
		}
		listener.onConnect(instances);
	}

	disconnect(listener: DevtoolsAgent): void {
		this.listeners = this.listeners.filter((t) => t !== listener);
	}

	emitCreation(instance: AnyInstance): void {
		if (instance.config.hideFromDevtools) return;
		this.listeners.forEach((listener) => listener.emitCreation(instance));
	}

	emitDispose(instance: AnyInstance): void {
		if (instance.config.hideFromDevtools) return;
		this.listeners.forEach((listener) => listener.emitDispose(instance));
	}

	emitInstance(instance: AnyInstance): void {
		if (instance.config.hideFromDevtools) return;
		this.listeners.forEach((listener) => listener.emitInstance(instance));
	}

	emitRun(instance: AnyInstance, cache: boolean): void {
		if (instance.config.hideFromDevtools) return;
		this.listeners.forEach((listener) => listener.emitRun(instance, cache));
	}

	emitSub(instance: AnyInstance, key: string): void {
		if (instance.config.hideFromDevtools) return;
		this.ensureInstanceIsRetained(instance);
		this.listeners.forEach((listener) => listener.emitSub(instance, key));
	}

	emitUnsub(instance: AnyInstance, key: string): void {
		if (instance.config.hideFromDevtools) return;
		// undefined is considered truthy for backward compatibility
		// when an unsubscription occurs when not retained by a context, if
		// there is no subscription remaining, remove standalone instances
		if (
			instance.config.storeInContext === false &&
			Object.keys(instance.subscriptions!).length === 0
		) {
			this.standalone.delete(instance);
		}
		this.listeners.forEach((listener) => listener.emitUnsub(instance, key));
	}

	startUpdate(instance: AnyInstance): void {
		if (instance.config.hideFromDevtools) return;
		this.listeners.forEach((listener) => listener.startUpdate(instance));
	}

	emitUpdate(instance: AnyInstance, replace: boolean): void {
		if (instance.config.hideFromDevtools) return;
		this.listeners.forEach((listener) =>
			listener.emitUpdate(instance, replace)
		);
	}

	captureContext(context: LibraryContext) {
		this.contexts.add(context);
	}

	onConnect(): void {
		throw new Error("The library devtools agent doesn't have an onConnect.");
	}

	releaseContext(context: LibraryContext) {
		this.contexts.delete(context);
	}

	private ensureInstanceIsRetained(instance: AnyInstance) {
		// undefined is considered truthy for backward compatibility
		if (instance.config.storeInContext === false) {
			this.standalone.add(instance);
		}
	}
}

export let devtools: DevtoolsAgent;
if (__DEV__) {
	devtools = new LibraryDevtools();
}
