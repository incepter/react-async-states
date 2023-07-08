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
import { requestContext } from "./FiberContext";

let stateFiberId = 0;

export class StateFiberRoot<T, A extends unknown[], R, P>
	implements IStateFiberRoot<T, A, R, P>
{
	root: StateRoot<T, A, R, P>;
	constructor(root: StateRoot<T, A, R, P>) {
		this.root = root;
		this.bind = this.bind.bind(this);
	}

	bind(ctx: any): IStateFiber<T, A, R, P> {
		let context = requestContext(ctx);
		let fiber = new StateFiber(this.root, context);
		context.set(this.root.key, fiber);
		return fiber;
	}
}

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

	constructor(root: StateRoot<T, A, R, P>, context: ILibraryContext) {
		super(root);
		let existingFiber = context.get(root.key);

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

		// context.set(root.key, this);
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
