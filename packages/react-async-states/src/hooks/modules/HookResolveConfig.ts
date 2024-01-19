import { __DEV__, assign } from "../../shared";
import {
  createContext,
  createSource,
  isSource,
  LibraryContext,
  nextKey,
  requestContext,
  Source,
  State,
  StateInterface,
} from "async-states";
import { BaseConfig, MixedConfig, PartialUseAsyncConfig } from "../types";
import { isServer } from "../../provider/context";

let currentOverrides: PartialUseAsyncConfig<any, any, any, any> | null;
export function setCurrentHookOverrides(
  overrides: PartialUseAsyncConfig<any, any, any, any> | null
) {
  currentOverrides = overrides;
}

// the goal of this function is to retrieve the following objects:
// - a configuration object to use { key, producer, source, lazy ... }
function cloneSourceInTheServer<TData, TArgs extends unknown[], TError>(
  globalSource: Source<TData, TArgs, TError>,
  context: object,
  useGlobalSourceState?: boolean
) {
  let instance = globalSource.inst;
  let { config, fn, key } = instance;
  let newConfig = assign({}, config, { context });

  let source = createSource(key, fn, newConfig);
  let newInstance = source.inst;
  if (useGlobalSourceState === true) {
    let globalInstance = globalSource.inst;

    // we will clone all relevant things: state, cache, lastRun
    newInstance.state = globalInstance.state;
    newInstance.cache = globalInstance.cache;
    newInstance.latestRun = globalInstance.latestRun;
  }

  newInstance.global = true;
  return source;
}

// - the state instance
export function parseConfig<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
>(
  currentLibContext: LibraryContext | null,
  options: MixedConfig<TData, TArgs, TError, S>,
  overrides?: PartialUseAsyncConfig<TData, TArgs, TError, S> | null
) {
  requireAnExecContextInServer(currentLibContext, options);

  let executionContext: LibraryContext;
  let instance: StateInterface<TData, TArgs, TError>;
  let parsedConfiguration: PartialUseAsyncConfig<TData, TArgs, TError, S>;

  switch (typeof options) {
    // the user provided an object configuration or a Source
    // In the case of a source, we will detect if it was a global source
    // (the heuristic to detect that is to check if it belongs to another
    // context object), if that's the case, a new source will be created
    // in the current context and used
    case "object": {
      if (isSource<TData, TArgs, TError>(options)) {
        if (isServer) {
          // requireAnExecContextInServer would throw if nullish
          let ctx = currentLibContext!.ctx;
          instance = cloneSourceInTheServer(options, ctx).inst;
        } else {
          instance = options.inst;
        }
        parsedConfiguration = assign({}, overrides, currentOverrides);
        parsedConfiguration.source = options;
        break;
      }

      let config = options as BaseConfig<TData, TArgs, TError>;
      if (config.source && isSource<TData, TArgs, TError>(config.source)) {
        let baseSource = config.source;
        if (isServer) {
          // requireAnExecContextInServer would throw if nullish
          let ctx = currentLibContext!.ctx;
          let useServerState = config.useServerState;
          baseSource = cloneSourceInTheServer(baseSource, ctx, useServerState);
        }
        let realSource = baseSource.getLane(config.lane);
        instance = realSource.inst;
        parsedConfiguration = assign({}, config, overrides, currentOverrides);
        parsedConfiguration.source = realSource;
        break;
      }

      let nullableExecContext = currentLibContext;

      if (config.context) {
        executionContext = createContext(config.context);
      } else if (nullableExecContext) {
        executionContext = nullableExecContext;
      } else {
        executionContext = requestContext(null);
      }
      parsedConfiguration = assign({}, options, overrides, currentOverrides);
      // parsedConfig is created by the library, so okay to mutate it internally
      parsedConfiguration.context = executionContext.ctx;

      if (!executionContext) {
        throw new Error("Exec context not defined, this is a bug");
      }

      instance = resolveFromObjectConfig(executionContext, parsedConfiguration);
      break;
    }
    // this is a string provided to useAsync, that we will lookup the instance
    // by the given key in the context, if not found it will be created
    // with the given config and it will stay there
    case "string": {
      parsedConfiguration = assign({}, overrides, currentOverrides);
      parsedConfiguration.key = options;
      let nullableExecContext = currentLibContext;
      if (nullableExecContext) {
        executionContext = nullableExecContext;
      } else {
        executionContext = requestContext(null);
      }

      // parsedConfig is created by the library, so okay to mutate it internally
      parsedConfiguration.context = executionContext.ctx;
      instance = resolveFromStringConfig(executionContext, parsedConfiguration);
      break;
    }
    // this is a function provided to useAsync, means the state instance
    // will be removed when the component unmounts and it won't be stored in the
    // context
    case "function": {
      parsedConfiguration = assign({}, overrides, currentOverrides);

      parsedConfiguration.producer = options;
      parsedConfiguration.context = currentLibContext?.ctx ?? null;

      instance = resolveFromFunctionConfig(parsedConfiguration);
      break;
    }

    // at this point, config is a plain object
    default: {
      parsedConfiguration = assign({}, overrides, currentOverrides);

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
function resolveFromObjectConfig<TData, TArgs extends unknown[], TError>(
  executionContext: LibraryContext,
  parsedConfiguration: PartialUseAsyncConfig<TData, TArgs, TError, any>
): StateInterface<TData, TArgs, TError> {
  let { key, producer } = parsedConfiguration;

  if (!key) {
    requireAKeyInTheServer();
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
function resolveFromStringConfig<TData, TArgs extends unknown[], TError>(
  executionContext: LibraryContext,
  parsedConfiguration: PartialUseAsyncConfig<TData, TArgs, TError, any>
): StateInterface<TData, TArgs, TError> {
  // key should never be undefined in this path
  let key = parsedConfiguration.key!;
  let existingInstance = executionContext.get(key);

  if (existingInstance) {
    return existingInstance;
  }

  return createSource(key, null, parsedConfiguration).inst;
}

function resolveFromFunctionConfig<TData, TArgs extends unknown[], TError>(
  parsedConfiguration: PartialUseAsyncConfig<TData, TArgs, TError, any>
): StateInterface<TData, TArgs, TError> {
  requireAKeyInTheServer();
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
  if (!isServer || typeof mixedConfig !== "object") {
    return;
  }

  if (parentExecContext) {
    return;
  }

  let baseConfig = mixedConfig as BaseConfig<any, any, any>;
  // at this point, we have an object (not a source)
  if (!baseConfig.context) {
    if (__DEV__) {
      console.error(
        "A context object is mandatory when working in the server " +
          "to avoid leaks between requests. \nAdd the following up in the tree:\n" +
          "import { Provider } from 'react-async-states';\n" +
          "<Provider>{yourChildrenTree}</Provider>;\n"
      );
    }
    throw new Error("A Provider is mandatory in the server");
  }
}

function requireAKeyInTheServer() {
  if (!isServer) {
    return;
  }
  throw new Error("A key is required in the server");
}
