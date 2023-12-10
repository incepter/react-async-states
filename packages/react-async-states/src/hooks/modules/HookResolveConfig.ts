import { assign } from "../../shared";
import {
	createContext,
	createSource,
	isSource,
	LibraryContext,
	nextKey,
	requestContext,
	State,
	StateInterface,
} from "async-states";
import {
	BaseConfig,
	MixedConfig,
	PartialUseAsyncStateConfiguration,
} from "../types";
import { isServer } from "../../provider/context";

// the goal of this function is to retrieve the following objects:
// - a configuration object to use { key, producer, source, lazy ... }
// - the state instance
export function parseConfig<T, A extends unknown[], E, S = State<T, A, E>>(
	currentLibContext: LibraryContext | null,
	mixedConfig: MixedConfig<T, A, E, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, A, E, S> | null
) {
	requireAnExecContextInServer(currentLibContext, mixedConfig);

	let executionContext: LibraryContext;
	let instance: StateInterface<T, A, E>;
	let parsedConfiguration: PartialUseAsyncStateConfiguration<T, A, E, S>;

	switch (typeof mixedConfig) {
		// the user provided an object configuration or a Source
		case "object": {
			if (isSource<T, A, E>(mixedConfig)) {
				instance = mixedConfig.inst;
				parsedConfiguration = assign({}, overrides, { source: mixedConfig });
				break;
			}

			let baseConfig = mixedConfig as BaseConfig<T, A, E>;
			if (baseConfig.source && isSource<T, A, E>(baseConfig.source)) {
				let realSource = baseConfig.source.getLane(baseConfig.lane);
				instance = realSource.inst;
				parsedConfiguration = assign({}, baseConfig, overrides, {
					source: realSource,
				});
				break;
			}

			let nullableExecContext = currentLibContext;

			if (baseConfig.context) {
				executionContext = createContext(baseConfig.context);
			} else if (nullableExecContext) {
				executionContext = nullableExecContext;
			} else {
				executionContext = requestContext(null);
			}
			parsedConfiguration = assign({}, mixedConfig, overrides);
			// the parsed config is created by the library, so okay to mutate it.
			parsedConfiguration.context = executionContext.ctx;

			if (!executionContext) {
				throw new Error("Exec context not defined, this is a bug");
			}

			instance = resolveFromObjectConfig(executionContext, parsedConfiguration);
			break;
		}
		// the user provided a string key
		case "string": {
			parsedConfiguration = assign({}, overrides, { key: mixedConfig });

			let nullableExecContext = currentLibContext;
			if (nullableExecContext) {
				executionContext = nullableExecContext;
			} else {
				executionContext = requestContext(null);
			}

			// the parsed config is created by the library, so okay to mutate it.
			parsedConfiguration.context = executionContext.ctx;
			instance = resolveFromStringConfig(executionContext, parsedConfiguration);
			break;
		}
		// first, detect the LibraryContext
		case "function": {
			parsedConfiguration = assign({}, overrides, { producer: mixedConfig });
			parsedConfiguration.context = currentLibContext?.ctx ?? null;

			instance = resolveFromFunctionConfig(parsedConfiguration);
			break;
		}

		default: {
			parsedConfiguration = assign({}, overrides);

			let nullableExecContext = currentLibContext;
			if (nullableExecContext) {
				executionContext = nullableExecContext;
			} else {
				executionContext = requestContext(null);
			}
			// the parsed config is created by the library, so okay to mutate it.
			parsedConfiguration.context = executionContext.ctx;

			instance = resolveFromObjectConfig(executionContext, parsedConfiguration);
		}
	}

	return {
		instance,
		config: parsedConfiguration,
	};
}

// object type has these specific rules:
// - it is not a source
// - the user provided a configuration object (not through overrides)
// - cases when it contains { source } should be supported before calling this
function resolveFromObjectConfig<T, A extends unknown[], E>(
	executionContext: LibraryContext,
	parsedConfiguration: PartialUseAsyncStateConfiguration<T, A, E, any>
): StateInterface<T, A, E> {
	let { key, producer } = parsedConfiguration;

	if (!key) {
		key = nextKey();
		// anonymous states won't be stored in the context for easier GC
		parsedConfiguration.storeInContext = false;
	}
	let existingInstance = executionContext.get(key);

	if (existingInstance) {
		return existingInstance.actions.getLane(parsedConfiguration.lane).inst;
	}

	return createSource(key, producer, parsedConfiguration).getLane(
		parsedConfiguration.lane
	).inst;
}

// the user provided a string to useAsync(key, deps)
function resolveFromStringConfig<T, A extends unknown[], E>(
	executionContext: LibraryContext,
	parsedConfiguration: PartialUseAsyncStateConfiguration<T, A, E, any>
): StateInterface<T, A, E> {
	// key should never be undefined in this path
	let key = parsedConfiguration.key!;
	let existingInstance = executionContext.get(key);

	if (existingInstance) {
		return existingInstance;
	}

	return createSource(key, null, parsedConfiguration).inst;
}

function resolveFromFunctionConfig<T, A extends unknown[], E>(
	parsedConfiguration: PartialUseAsyncStateConfiguration<T, A, E, any>
): StateInterface<T, A, E> {
	let key = nextKey();

	// anonymous states won't be stored in the context for easier GC
	parsedConfiguration.storeInContext = false;
	// todo: reuse instance from previous render
	return createSource(key, parsedConfiguration.producer, parsedConfiguration)
		.inst;
}

// this function throws in the server when there is no context provided
function requireAnExecContextInServer(
	parentExecContext: LibraryContext | null,
	mixedConfig: MixedConfig<any, any, any, any>
) {
	// opt-out for these cases:
	// - not in server
	// - we are in a Library Context provider tree (and not using a source)
	// - the provided config is not an object (then, we will attach to parent provider)
	if (
		!isServer ||
		typeof mixedConfig !== "object"
	) {
		return;
	}

	if (isSource(mixedConfig)) {
		let instance = mixedConfig.inst;
		let ctx = instance.ctx;
		if (ctx !== parentExecContext) {
			throw new Error(`Source ${instance.key} is leaking between contexts`);
		}
	}

	let baseConfig = mixedConfig as BaseConfig<any, any, any>;
	if (isSource(baseConfig.source)) {
		let instance = baseConfig.source.inst;
		let ctx = instance.ctx;
		if (ctx !== parentExecContext) {
			throw new Error(`Source ${instance.key} is leaking between contexts`);
		}
	}

	if (parentExecContext) {
		return;
	}

	// at this point, we have an object (not a source)
	if (!baseConfig.context) {
		throw new Error(
			"A context object is mandatory when working in the server " +
				"to avoid leaks between requests. \nAdd the following up in the tree:\n" +
				"import { Provider } from 'react-async-states';\n" +
				"<Provider context={requestObject}>{yourChildrenTree}</Provider>;\n" +
				"The request object should be unique to every request to perform isolation."
		);
	}
}
