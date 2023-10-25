import {
	BaseConfig,
	BaseUseAsyncState,
	CleanupFn,
	MixedConfig,
	PartialUseAsyncStateConfiguration,
	SubscribeEventProps,
	UseAsyncState,
	UseAsyncStateEventFn,
	UseAsyncStateEventSubscribe,
} from "./types.internal";
import type {
	AbortFn,
	Producer,
	ProducerConfig,
	Source,
	State,
	StateInterface,
	LibraryContext,
} from "async-states";
import {
	AsyncState,
	isSource,
	nextKey,
	readSource,
	Status,
} from "async-states";

import {
	AUTO_RUN,
	CHANGE_EVENTS,
	CONCURRENT,
	CONFIG_FUNCTION,
	CONFIG_OBJECT,
	CONFIG_SOURCE,
	CONFIG_STRING,
	EQUALITY_CHECK,
	LANE,
	NO_MODE,
	SELECTOR,
	SOURCE,
	SUBSCRIBE_EVENTS,
} from "./StateHookFlags";
import { __DEV__, emptyArray, freeze, isArray, isFunction } from "../shared";
import { mapFlags } from "../shared/mapFlags";

export function resolveFlags<T, E, A extends unknown[], S>(
	mixedConfig: MixedConfig<T, E, A, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): number {
	let flags = NO_MODE;

	switch (typeof mixedConfig) {
		case "function": {
			return flags | CONFIG_FUNCTION | getConfigFlags(overrides);
		}
		case "string": {
			flags |= CONFIG_STRING | getConfigFlags(overrides);
			return flags;
		}

		case "object": {
			// attempt source first
			let baseConfig = mixedConfig as BaseConfig<T, E, A>;
			if (isSource(baseConfig)) {
				return flags | CONFIG_SOURCE | SOURCE | getConfigFlags(overrides);
			} else if (isSource(baseConfig.source)) {
				return (
					flags |
					CONFIG_OBJECT |
					SOURCE |
					getConfigFlags(baseConfig) |
					getConfigFlags(overrides)
				);
			} else {
				flags |=
					CONFIG_OBJECT |
					getConfigFlags(baseConfig) |
					getConfigFlags(overrides);

				return flags;
			}
		}
		// let result = useAsyncState() also should work (useAsyncState.lazy..also)
		default: {
			return flags | getConfigFlags(overrides);
		}
	}
}

let ConfigurationSpecialFlags = freeze({
	lane: LANE,
	selector: SELECTOR,
	areEqual: EQUALITY_CHECK,
	concurrent: (value) => (value === true ? CONCURRENT : NO_MODE),
	events: (events) => {
		let flags = NO_MODE;
		if (events) {
			if (events.change) {
				flags |= CHANGE_EVENTS;
			}
			if (events.subscribe) {
				flags |= SUBSCRIBE_EVENTS;
			}
		}
		return flags;
	},
	lazy: (lazy) => (lazy === false ? AUTO_RUN : NO_MODE),
});

function getConfigFlags<T, E, A extends unknown[], S>(
	config?: PartialUseAsyncStateConfiguration<T, E, A, S>
): number {
	if (!config) {
		return NO_MODE;
	}
	let flags = NO_MODE;
	for (let key of Object.keys(config)) {
		let flagsReader = ConfigurationSpecialFlags[key];

		if (isFunction(flagsReader)) {
			flags |= flagsReader(config[key]);
		} else if (typeof flagsReader === "number" && config[key]) {
			flags |= flagsReader;
		}
	}
	return flags;
}

export function resolveInstance<T, E, A extends unknown[], S>(
	context: LibraryContext,
	flags: number,
	config: MixedConfig<T, E, A, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): StateInterface<T, E, A> | null {
	if (flags & SOURCE) {
		return resolveSourceInstance<T, E, A, S>(flags, config, overrides);
	}

	return resolveStandaloneInstance<T, E, A, S>(
		context,
		flags,
		config,
		overrides
	);
}

function resolveSourceInstance<T, E, A extends unknown[], S>(
	flags: number,
	config: MixedConfig<T, E, A, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
) {
	if (flags & CONFIG_SOURCE) {
		let instance = readSource(config as Source<T, E, A>);
		if (flags & LANE) {
			// config is a source, so ofc doesn't contain lane prop
			let laneKey = overrides?.lane;
			instance = instance.actions.getLane(laneKey).inst;
		}
		return instance;
	}

	let givenConfig = config as BaseConfig<T, E, A>;
	let instance = readSource(givenConfig.source!);
	if (flags & LANE) {
		let laneKey = (config as BaseConfig<T, E, A>).lane || overrides?.lane;
		return instance.actions.getLane(laneKey).inst;
	}
	return instance;
}

function resolveStandaloneInstance<T, E, A extends unknown[], S>(
	context: LibraryContext,
	flags: number,
	config: MixedConfig<T, E, A, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): StateInterface<T, E, A> {
	let key = readKeyFromConfig(flags, config, null);
	let producer = readProducerFromConfig(flags, config);
	let producerConfig = readProducerConfigFromConfig(flags, config);

	let prevInstance = context.get(key) as StateInterface<T, E, A> | undefined;

	if (prevInstance) {
		let instance = prevInstance;
		if (flags & LANE) {
			let lane = readLaneFromConfig(config, overrides);
			instance = instance.actions.getLane(lane).inst;
		}

		if (Object.prototype.hasOwnProperty.call(config, "producer")) {
			instance.actions.replaceProducer(producer || null);
		}
		if (producerConfig) {
			instance.actions.patchConfig(producerConfig);
		}

		return instance;
	}

	let instance: StateInterface<T, E, A> = new AsyncState(
		key,
		producer,
		Object.assign({}, producerConfig, {
			context: context.ctx,
		})
	);

	if (flags & LANE) {
		let lane = readLaneFromConfig(config, overrides);
		instance = instance.actions.getLane(lane).inst;
	}

	return instance;
}

function readKeyFromConfig<T, E, A extends unknown[], S>(
	flags: number,
	config: MixedConfig<T, E, A, S>,
	prevInstance: StateInterface<T, E, A> | null
): string {
	if (flags & CONFIG_STRING) {
		return config as string;
	}

	if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, A>).key) {
		return (config as BaseConfig<T, E, A>).key!;
	}

	if (!prevInstance) {
		return nextKey();
	}

	return prevInstance.key;
}

function readProducerFromConfig<T, E, A extends unknown[]>(
	flags: number,
	config: MixedConfig<T, E, A>
): Producer<T, E, A> | undefined {
	if (flags & CONFIG_FUNCTION) {
		return config as Producer<T, E, A>;
	}

	if (flags & CONFIG_OBJECT) {
		return (config as BaseConfig<T, E, A>).producer;
	}

	return undefined;
}

function readProducerConfigFromConfig<T, E, A extends unknown[], S>(
	flags: number,
	config: MixedConfig<T, E, A, S>
): ProducerConfig<T, E, A> | undefined {
	if (flags & CONFIG_FUNCTION) {
		return undefined;
	}

	if (flags & CONFIG_OBJECT && !(flags & SOURCE)) {
		return config as BaseConfig<T, E, A>;
	}

	return undefined;
}

function readLaneFromConfig<T, E, A extends unknown[], S>(
	config: MixedConfig<T, E, A, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): string | undefined {
	if (overrides && overrides.lane) {
		return overrides.lane;
	}

	return (config as BaseConfig<T, E, A>).lane;
}

let warnedSourcePropertiesMap;
if (__DEV__) {
	warnedSourcePropertiesMap = new Map();
}

const ignoredProps = {
	key: true,
	source: true,
	devFlags: true,
	uniqueId: true,
};
function assignSourcePropertiesWithDeprecationUsage(source) {
	let output = {};
	for (let [key, value] of Object.entries(source)) {
		if (ignoredProps[key]) {
			output[key] = value;
		} else {
			Object.defineProperty(output, key, {
				enumerable: true,
				configurable: false,
				get(): any {
					if (!warnedSourcePropertiesMap.get(key)) {
						console.error(`[WARNING] - useAsyncState.${key} is deprecated. 
          please use useAsyncState(...).source.${key} instead.`);
						warnedSourcePropertiesMap.set(key, true);
					}
					return value;
				},
			});
		}
	}
	return output;
}

function makeBaseReturn<T, E, A extends unknown[], S>(
	flags: number,
	config: MixedConfig<T, E, A, S>,
	instance: StateInterface<T, E, A> | null
) {
	if (!instance) {
		let key: string =
			flags & CONFIG_STRING
				? (config as string)
				: (config as BaseConfig<T, E, A>).key!;

		// @ts-ignore
		let output = { key, flags } as BaseUseAsyncState<T, E, A, S>;
		// if (__DEV__) {
		// 	output.devFlags = mapFlags(flags);
		// }
		return output;
	}
	// @ts-ignore
	let output = Object.assign({}, {
		flags,
		source: instance.actions,
	}) as BaseUseAsyncState<T, E, A, S>;

	// if (__DEV__) {
	// 	output.devFlags = mapFlags(flags);
	// }
	return output;
}

function calculateSubscriptionKey<T, E, A extends unknown[], S>(
	flags: number,
	config: MixedConfig<T, E, A, S>,
	callerName: string | undefined,
	stateInterface: StateInterface<T, E, A> | null
): string | undefined {
	if (
		flags & CONFIG_OBJECT &&
		(config as BaseConfig<T, E, A>).subscriptionKey
	) {
		return (config as BaseConfig<T, E, A>).subscriptionKey;
	}

	if (__DEV__) {
		let instance = stateInterface as AsyncState<T, E, A>;
		if (!instance.subsIndex) {
			instance.subsIndex = 0;
		}
		let index = ++instance.subsIndex;
		return `${callerName}-${index}`;
	}
}

export function hookReturn<T, E, A extends unknown[], S>(
	flags: number,
	config: MixedConfig<T, E, A, S>,
	base: BaseUseAsyncState<T, E, A, S>,
	instance: StateInterface<T, E, A> | null
): Readonly<UseAsyncState<T, E, A, S>> {
	let baseToUse = base;
	let newState: UseAsyncState<T, E, A, S>;
	if (__DEV__) {
		baseToUse = assignSourcePropertiesWithDeprecationUsage(
			base
		) as BaseUseAsyncState<T, E, A, S>;
		newState = baseToUse as UseAsyncState<T, E, A, S>;
	} else {
		newState = Object.assign({}, base) as UseAsyncState<T, E, A, S>;
	}

	const newValue = readStateFromInstance(instance, flags, config);
	if (instance) {
		newState.version = instance?.version;
		newState.lastSuccess = instance.lastSuccess;
		// newState.read = createReadInConcurrentMode(
		// 	instance,
		// 	newValue,
		// 	flags,
		// 	config
		// );
	}
	newState.state = newValue;

	return freeze(newState);
}

export function createReadInConcurrentMode<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	stateValue: S,
	flags: number,
	config: MixedConfig<T, E, A, S>
) {
	return function read(
		suspend: "initial" | "pending" | "both" | true | false = true,
		throwError: boolean = true
	) {
		let {
			state: { status },
		} = instance;
		if (suspend && flags & AUTO_RUN) {
			if (
				(suspend === "both" || suspend === "initial") &&
				status === "initial"
			) {
				let args = (
					flags & CONFIG_OBJECT
						? (config as BaseConfig<T, E, A>).autoRunArgs
						: emptyArray
				) as A;
				throw instance.actions.runp.apply(null, args);
			}
			if (
				(suspend === "both" || suspend === "pending") &&
				status === "pending"
			) {
				throw instance.promise;
			}
			if (suspend === true && status === "pending") {
				throw instance.promise;
			}
		}
		if (throwError && Status.error === instance.state.status) {
			throw instance.state.data;
		}
		return stateValue;
	};
}

export function invokeSubscribeEvents<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	events: UseAsyncStateEventSubscribe<T, E, A> | undefined
): CleanupFn[] | null {
	if (!events || !instance) {
		return null;
	}

	let eventProps: SubscribeEventProps<T, E, A> = instance.actions;

	let handlers: ((props: SubscribeEventProps<T, E, A>) => CleanupFn)[] =
		isArray(events) ? events : [events];

	return handlers.map((handler) => handler(eventProps));
}

export function invokeChangeEvents<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	events: UseAsyncStateEventFn<T, E, A> | UseAsyncStateEventFn<T, E, A>[]
) {
	let nextState = instance.state;
	const changeHandlers: UseAsyncStateEventFn<T, E, A>[] = isArray(events)
		? events
		: [events];

	const eventProps = { state: nextState, source: instance.actions };

	changeHandlers.forEach((event) => {
		if (typeof event === "object") {
			const { handler, status } = event;
			if (!status || nextState.status === status) {
				handler(eventProps);
			}
		} else {
			event(eventProps);
		}
	});
}

// come here only in standalone mode

export function readStateFromInstance<
	T,
	E,
	R,
	A extends unknown[],
	S = State<T, E, A>
>(
	asyncState: StateInterface<T, E, A> | null,
	flags: number,
	config: MixedConfig<T, E, A, S>
): S {
	if (!asyncState) {
		return undefined as S;
	}
	const selector =
		flags & SELECTOR
			? (config as PartialUseAsyncStateConfiguration<T, E, A, S>).selector!
			: <K>(obj): K => obj;
	return selector(
		asyncState.state,
		asyncState.lastSuccess,
		asyncState.cache || null
	);
}

export type HookChangeEvents<T, E, A extends unknown[]> =
	| UseAsyncStateEventFn<T, E, A>
	| UseAsyncStateEventFn<T, E, A>[];

export type HookChangeEventsFunction<T, E, A extends unknown[]> =
	(prev?: HookChangeEvents<T, E, A>) => HookChangeEvents<T, E, A>

export interface HookOwnState<T, E, A extends unknown[], S> {
	context: LibraryContext;
	guard: number;
	config: MixedConfig<T, E, A, S>;
	return: UseAsyncState<T, E, A, S>;
	base: BaseUseAsyncState<T, E, A, S>;
	deps: unknown[];
	subKey: string | undefined;
	flags: number;
	instance: StateInterface<T, E, A> | null;
	renderInfo: {
		current: S;
		version: number | undefined;
	};

	getEvents(): {
		change: HookChangeEvents<T, E, A> | undefined;
		sub: UseAsyncStateEventSubscribe<T, E, A> | undefined;
	};

	subscribeEffect(
		updateState: () => void,
		setGuard: (updater: (prev: number) => number) => void
	): CleanupFn;
}

export function subscribeEffect<T, E, A extends unknown[], S>(
	hookState: HookOwnState<T, E, A, S>,
	updateState: () => void,
	setGuard: (updater: (prev: number) => number) => void
): CleanupFn {
	let { flags, config, instance, renderInfo, subKey } = hookState;

	let didClean = false;
	let cleanups: AbortFn[] = [() => (didClean = true)];

	function onStateChange() {
		if (didClean) {
			return;
		}
		let newSelectedState = readStateFromInstance(instance, flags, config);

		if (flags & EQUALITY_CHECK) {
			let areEqual = (config as PartialUseAsyncStateConfiguration<T, E, A, S>)
				.areEqual!(newSelectedState, renderInfo.current);

			if (!areEqual) {
				updateState();
			}
		} else {
			updateState();
		}

		let maybeEvents = hookState.getEvents();
		let maybeChangeEvents = maybeEvents.change;
		if (flags & CHANGE_EVENTS) {
			let changeEvents = (config as BaseConfig<T, E, A>).events?.change;
			if (changeEvents) {
				invokeChangeEvents(instance!, changeEvents);
			}
		}
		if (maybeChangeEvents) {
			invokeChangeEvents(instance!, maybeChangeEvents);
		}
	}

	// subscription
	cleanups.push(
		instance!.actions.subscribe({
			flags,
			key: subKey,
			cb: onStateChange,
		})
	);
	if (instance!.version !== renderInfo.version) {
		updateState();
	}

	if (flags & SUBSCRIBE_EVENTS) {
		let unsubscribeFns = invokeSubscribeEvents(
			instance!,
			(config as BaseConfig<T, E, A>).events!.subscribe
		);

		if (unsubscribeFns) {
			cleanups = cleanups.concat(unsubscribeFns);
		}
	}

	let maybeSubscriptionEvents = hookState.getEvents().sub;
	if (maybeSubscriptionEvents) {
		let unsubscribeFns = invokeSubscribeEvents(
			instance!,
			maybeSubscriptionEvents
		);
		if (unsubscribeFns) {
			cleanups = cleanups.concat(unsubscribeFns);
		}
	}

	return function cleanup() {
		cleanups.forEach((cb) => {
			if (cb) {
				cb();
			}
		});
	};
}

export function createHook<T, E, A extends unknown[], S>(
	executionContext: LibraryContext,
	config: MixedConfig<T, E, A, S>,
	deps: unknown[],
	guard: number,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>,
	caller?: string
): HookOwnState<T, E, A, S> {
	let newFlags = resolveFlags(config, overrides);
	let newInstance = resolveInstance(
		executionContext,
		newFlags,
		config,
		overrides
	);

	let baseReturn = makeBaseReturn(newFlags, config, newInstance);
	baseReturn.onChange = onChange;
	baseReturn.onSubscribe = onSubscribe;

	let currentReturn = hookReturn(newFlags, config, baseReturn, newInstance);
	let subscriptionKey = calculateSubscriptionKey(
		newFlags,
		config,
		caller,
		newInstance
	);

	if (newInstance && newFlags & CONFIG_OBJECT) {
		let configObject = config as BaseConfig<T, E, A>;
		if (configObject.payload) {
			newInstance.actions.mergePayload(configObject.payload);
		}
	}

	let changeEvents: HookChangeEvents<T, E, A> | undefined = undefined;
	let subscribeEvents: UseAsyncStateEventSubscribe<T, E, A> | undefined =
		undefined;
	// ts complains about subscribeEffect not present, it is assigned later
	// @ts-ignore
	let hook: HookOwnState<T, E, A, S> = {
		deps,
		guard,
		config,
		flags: newFlags,
		base: baseReturn,
		return: currentReturn,
		instance: newInstance,
		subKey: subscriptionKey,
		context: executionContext,
		renderInfo: {
			current: currentReturn.state,
			version: currentReturn.version,
		},
		getEvents() {
			return {
				change: changeEvents,
				sub: subscribeEvents,
			};
		},
	};
	// @ts-ignore WTF TS strict!!!
	hook.subscribeEffect = subscribeEffect.bind(null, hook);

	return hook;

	function onChange(
		events:
			| ((prevEvents?: HookChangeEvents<T, E, A>) => HookChangeEvents<T, E, A>)
			| HookChangeEvents<T, E, A>
	) {
		if (isFunction(events)) {
			let maybeEvents = (
				events as (
					prevEvents?: HookChangeEvents<T, E, A>
				) => HookChangeEvents<T, E, A>
			)(changeEvents);
			if (maybeEvents) {
				changeEvents = maybeEvents;
			}
		} else if (events) {
			changeEvents = events as HookChangeEvents<T, E, A>;
		}
	}

	function onSubscribe(
		events:
			| ((prevEvents?: UseAsyncStateEventSubscribe<T, E, A>) => void)
			| UseAsyncStateEventSubscribe<T, E, A>
	) {
		if (isFunction(events)) {
			let maybeEvents = (
				events as (
					prevEvents?: UseAsyncStateEventSubscribe<T, E, A>
				) => UseAsyncStateEventSubscribe<T, E, A>
			)(subscribeEvents);
			if (maybeEvents) {
				subscribeEvents = maybeEvents;
			}
		} else if (events) {
			subscribeEvents = events as UseAsyncStateEventSubscribe<T, E, A>;
		}
	}
}

export function shouldRunGivenConfig<T, E, A extends unknown[]>(
	flags: number,
	config: MixedConfig<T, E, A>,
	state: State<T, E, A>,
	payload?: Record<string, unknown> | null
): boolean {
	let shouldRun = true;

	if (flags & CONFIG_OBJECT) {
		let configObject = config as BaseConfig<T, E, A>;
		if (isFunction(configObject.condition)) {
			let conditionFn = configObject.condition as (
				state: State<T, E, A>,
				args?: A,
				payload?: Record<string, unknown> | null
			) => boolean;
			shouldRun = conditionFn(state, configObject.autoRunArgs, payload);
		} else if (configObject.condition === false) {
			shouldRun = false;
		}
	}

	return shouldRun;
}

export function autoRun<T, E, A extends unknown[], S>(
	flags: number,
	source: Source<T, E, A> | undefined,
	config: MixedConfig<T, E, A>
): CleanupFn {
	// in concurrent mode, runs will be performed by throwing a promise!
	if (!(flags & AUTO_RUN) || !source || flags & CONCURRENT) {
		return;
	}

	if (
		shouldRunGivenConfig(flags, config, source.getState(), source.getPayload())
	) {
		if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, A>).autoRunArgs) {
			let { autoRunArgs } = config as BaseConfig<T, E, A>;
			if (autoRunArgs && isArray(autoRunArgs)) {
				return source.run.apply(null, autoRunArgs);
			}
		}

		return source.run.apply(null);
	}
}
