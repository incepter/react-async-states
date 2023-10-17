import {
	FiberDataUpdate,
	FiberDataUpdater,
	ILibraryContext,
	InitialState,
	IStateFiber,
	IStateFiberActions,
	IStateFiberRoot,
	PendingRun,
	PendingUpdate,
	RuncProps,
	RunTask,
	State,
	StateRoot,
	UpdateQueue,
} from "./_types";
import { runcStateFiber, runpStateFiber, runStateFiber } from "./FiberRun";
import {
	enqueueDataUpdate,
	enqueueErrorUpdate,
	enqueueStateUpdate,
} from "./FiberUpdate";
import { requestContext } from "./FiberContext";
import { dispatchNotification } from "./FiberDispatch";

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

	state: State<T, A, R, P>; // TBD
	task: RunTask<T, A, R, P> | null;
	pending: RunTask<T, A, R, P> | null;

	context: ILibraryContext;
	listeners: Map<Function, any>;
	actions: IStateFiberActions<T, A, R, P>;

	pendingRun: PendingRun | null;
	pendingUpdate: PendingUpdate | null;

	queue: UpdateQueue<T, A, R, P> | null;
	queueId: ReturnType<typeof setTimeout> | null;

	constructor(root: StateRoot<T, A, R, P>, context: ILibraryContext) {
		super(root);
		let existingFiber = context.get(root.key);

		if (existingFiber) {
			return existingFiber;
		}

		this.version = 0;
		this.task = null;
		this.pending = null;
		// todo: support payload
		// this.payload = null;
		this.context = context;
		this.id = ++stateFiberId;
		this.state = computeInitialState(this);
		this.listeners = new Map<Function, any>();
		this.actions = new StateFiberActions(this);

		this.queue = null;
		this.queueId = null;
		this.pendingRun = null;
		this.pendingUpdate = null;

		// context.set(root.key, this);
	}
}

function computeInitialState<T, A extends unknown[], R, P>(
	instance: IStateFiber<T, A, R, P>
): InitialState<T> {
	let { root } = instance;
	let config = root.config;
	let state = {
		status: "initial",
	};

	if (config && Object.hasOwn(config, "initialValue")) {
		// @ts-ignore
		// todo: function + pass cache
		// todo: try catch to trigger error initially
		state.data = config.initialValue;
	}

	return Object.freeze(state as InitialState<T>);
}

export class StateFiberActions<T, A extends unknown[], R, P>
	implements IStateFiberActions<T, A, R, P>
{
	private readonly self: IStateFiber<T, A, R, P>;

	constructor(instance: IStateFiber<T, A, R, P>) {
		this.self = instance;
		this.getPayload = this.getPayload.bind(this);
		this.mergePayload = this.mergePayload.bind(this);
		this.run = this.run.bind(this);
		this.runp = this.runp.bind(this);
		this.runc = this.runc.bind(this);
		this.setData = this.setData.bind(this);
		this.setError = this.setError.bind(this);
		this.setState = this.setState.bind(this);
		this.runc = this.runc.bind(this);
		this.dispose = this.dispose.bind(this);
		this.getState = this.getState.bind(this);
		this.subscribe = this.subscribe.bind(this);
	}

	getPayload(): P {
		return this.self.payload;
	}

	mergePayload(p: Partial<P>): void {
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

	setData(update: FiberDataUpdate<T> | FiberDataUpdater<T>): void {
		enqueueDataUpdate(this.self, update, null);
		dispatchNotification(this.self);
	}

	setError(error: R): void {
		enqueueErrorUpdate(this.self, error, null);
		dispatchNotification(this.self);
	}

	setState(
		state: State<T, A, R, P> | ((prev: State<T, A, R, P>) => State<T, A, R, P>)
	): void {
		enqueueStateUpdate(this.self, state, null);
		dispatchNotification(this.self);
	}

	dispose(): void {}

	getState(): any {
		return this.self.state;
	}

	subscribe(cb: Function, data: any): () => void {
		let instance = this.self;
		instance.listeners.set(cb, data);
		return () => instance.listeners.delete(cb);
	}
}
