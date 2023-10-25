import {
	BaseConfig,
	MixedConfig,
	PartialUseAsyncStateConfiguration,
} from "../../state-hook/types.internal";
import { assign } from "../../shared";
import {
	createSource,
	isSource,
	LibraryContext,
	nextKey,
	requestContext,
	State,
	StateInterface,
} from "async-states";

// the goal of this function is to retrieve the following objects:
// - a configuration object to use { key, producer, source, lazy ... }
// - the state instance
export function parseConfig<T, E, A extends unknown[], S = State<T, E, A>>(
	currentExecContext: any,
	mixedConfig: MixedConfig<T, E, A, S>,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
) {
	let executionContext: LibraryContext;
	let instance: StateInterface<T, E, A>;
	let parsedConfiguration: PartialUseAsyncStateConfiguration<T, E, A, S>;

	switch (typeof mixedConfig) {
		// the user provided an object configuration or a Source
		case "object": {
			if (isSource<T, E, A>(mixedConfig)) {
				instance = mixedConfig.inst;
				parsedConfiguration = assign({}, overrides, { source: mixedConfig });
				break;
			}

			let baseConfig = mixedConfig as BaseConfig<T, E, A>;
			if (baseConfig.source && isSource<T, E, A>(baseConfig.source)) {
				let realSource = baseConfig.source.getLane(baseConfig.lane);
				instance = realSource.inst;
				parsedConfiguration = assign({}, baseConfig, overrides, {
					source: realSource,
				});
				break;
			}

			let contextArgToUse = baseConfig.context || currentExecContext;
			executionContext = requestContext(contextArgToUse);
			parsedConfiguration = assign({}, mixedConfig, overrides);

			// the parsed config is created by the library, so okay to mutate it.
			parsedConfiguration.context = contextArgToUse;
			instance = resolveFromObjectConfig(executionContext, parsedConfiguration);
			break;
		}
		// the user provided a string key
		case "string": {
			executionContext = requestContext(currentExecContext);
			parsedConfiguration = assign({}, overrides, { key: mixedConfig });
			// the parsed config is created by the library, so okay to mutate it.
			parsedConfiguration.context = currentExecContext;
			instance = resolveFromStringConfig(executionContext, parsedConfiguration);
			break;
		}
		// first, detect the LibraryContext
		case "function": {
			parsedConfiguration = assign({}, overrides, { producer: mixedConfig });
			parsedConfiguration.context = currentExecContext;
			instance = resolveFromFunctionConfig(parsedConfiguration);
			break;
		}

		default: {
			parsedConfiguration = assign({}, overrides);
			parsedConfiguration.context = currentExecContext;
			executionContext = requestContext(currentExecContext);
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
function resolveFromObjectConfig<T, E, A extends unknown[]>(
	executionContext: LibraryContext,
	parsedConfiguration: PartialUseAsyncStateConfiguration<T, E, A, any>
): StateInterface<T, E, A> {
	let { key, producer } = parsedConfiguration;
	if (!key) {
		key = nextKey();
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
function resolveFromStringConfig<T, E, A extends unknown[]>(
	executionContext: LibraryContext,
	parsedConfiguration: PartialUseAsyncStateConfiguration<T, E, A, any>
): StateInterface<T, E, A> {
	// key should never be undefined in this path
	let key = parsedConfiguration.key!;
	let existingInstance = executionContext.get(key);

	if (existingInstance) {
		return existingInstance;
	}

	return createSource(key, null, parsedConfiguration).inst;
}

function resolveFromFunctionConfig<T, E, A extends unknown[]>(
	parsedConfiguration: PartialUseAsyncStateConfiguration<T, E, A, any>
): StateInterface<T, E, A> {
	let key = nextKey();
	// todo: reuse instance from previous render
	return createSource(key, parsedConfiguration.producer!, parsedConfiguration)
		.inst;
}
