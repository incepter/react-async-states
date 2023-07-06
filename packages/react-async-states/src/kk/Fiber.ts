//region State Root
import {
	ILibraryContext,
	IStateFiber,
	IStateFiberActions,
	IStateFiberRoot,
	RuncProps,
	RunTask,
	StateFiberListeners,
	StateRoot,
} from "./_types";
import { runcStateFiber, runpStateFiber, runStateFiber } from "./FiberRun";
import {
	enqueueDataUpdate,
	enqueueErrorUpdate,
	enqueueStateUpdate,
} from "./FiberUpdate";

//region Library Contexts
let LibraryContexts = new Map();

function requestContext(ctx: any): ILibraryContext {
	let existing = LibraryContexts.get(ctx);
	if (existing) {
		return existing;
	}

	let context = new LibraryContext(ctx);
	LibraryContexts.set(ctx, context);
	return context;
}

export function retainContext(ctx: any, context: ILibraryContext) {
	LibraryContexts.set(ctx, context);
}

export function removeContext(ctx: any) {
	return LibraryContexts.delete(ctx);
}

export class LibraryContext implements ILibraryContext {
	private readonly ctx: any;
	private readonly list: Map<string, IStateFiber<any, any, any, any>>;
	constructor(ctx) {
		this.ctx = ctx;
		this.get = this.get.bind(this);
		this.set = this.set.bind(this);
		this.remove = this.remove.bind(this);
	}
	get(key: string): IStateFiber<any, any, any, any> | undefined {
		return this.list.get(key);
	}
	set(key: string, instance: IStateFiber<any, any, any, any>): void {
		this.list.set(key, instance);
	}
	remove(key: string) {
		this.list.delete(key);
	}
}
//endregion

let stateFiberId = 0;

export class StateFiberRoot<T, A extends unknown[], R, P>
	implements IStateFiberRoot<T, A, R, P>
{
	root: StateRoot<T, A, R, P>;
	constructor(root) {
		this.root = root;
		this.bind = this.bind.bind(this);
	}

	bind(ctx: any): IStateFiber<T, A, R, P> {
		let context = requestContext(ctx);
		return new StateFiber(this.root, context);
	}
}
//endregion

export class StateFiber<T, A extends unknown[], R, P>
	extends StateFiberRoot<T, A, R, P>
	implements IStateFiber<T, A, R, P>
{
	id: number;
	payload: P;
	version: number;

	state: any; // TBD
	task: RunTask<T, A, R, P> | null;
	pending: RunTask<T, A, R, P> | null;

	context: ILibraryContext;
	actions: IStateFiberActions<T, A, R, P>;
	listeners: StateFiberListeners;

	constructor(root, context: ILibraryContext) {
		super(root);
		let existingFiber = context.get(root.name);

		if (existingFiber) {
			return existingFiber;
		}

		this.version = 0;
		this.task = null;
		this.pending = null;
		// this.payload = null; todo
		this.context = context;
		this.id = ++stateFiberId;
		this.state = computeInitialState(this);
		this.actions = new StateFiberActions(this);

		context.set(root.name, this);
	}
}

function computeInitialState<T, A extends unknown[], R, P>(
	instance: IStateFiber<T, A, R, P>
) {
	let { root } = instance;
	let config = root.config;
	let state = {
		status: "initial",
	};

	if (config && Object.hasOwn(config, "initialValue")) {
		// @ts-ignore
		// todo: function + pass cache
		state.data = config.initialValue;
	}

	return Object.freeze(state);
}

export class StateFiberActions<T, A extends unknown[], R, P>
	implements IStateFiberActions<T, A, R, P>
{
	private readonly self: IStateFiber<T, A, R, P>;

	constructor(instance: IStateFiber<T, A, R, P>) {
		this.self = instance;
	}

	getPayload(): any {
		return this.self.payload;
	}

	mergePayload(p: any): void {
		this.self.payload = Object.assign({}, this.self.payload, p);
	}

	run(...args: A): () => void {
		let instance = this.self;
		let payload = Object.assign({}, instance.payload);

		return runStateFiber(instance, args, payload);
	}

	runc(props: RuncProps<T, A, R, P>): () => void {
		return runcStateFiber(this.self, props);
	}

	runp(...args: A): Promise<any> {
		let instance = this.self;
		let payload = Object.assign({}, instance.payload);

		return runpStateFiber(instance, args, payload);
	}

	setData(update): void {
		enqueueDataUpdate(this.self, update);
	}

	setError(error): void {
		enqueueErrorUpdate(this.self, error);
	}

	setState(state): void {
		enqueueStateUpdate(this.self, state);
	}

	dispose(): void {}

	getState(): any {
		return this.self.state;
	}
}
