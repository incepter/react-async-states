import { UseConfig } from "../types.internal";
import { __DEV__, assign, emptyArray } from "../shared";
import { useCallerName } from "../helpers/useCallerName";
import { useData_internal } from "../hooks/useData_internal";
import { useAsync_internal } from "../hooks/useAsync_internal";
import {
  createContext,
  createSource,
  Producer,
  ProducerConfig,
  Source,
} from "async-states";
import {
  Api,
  App,
  AppShape,
  InferArgs,
  InferData,
  InferError,
  Resource,
} from "./types";
import { __DEV__setHookCallerName } from "../hooks/modules/HookSubscriptionUtils";

let didWarnAboutInitialShapeDeprecated = false;

export function createApplication<TApp extends AppShape>(
  initialShape?: any,
  context?: object
): App<TApp> {
  if (__DEV__) {
    if (initialShape !== undefined && !didWarnAboutInitialShapeDeprecated) {
      didWarnAboutInitialShapeDeprecated = true;
      console.error(
        "createApplication's first argument was removed, it doesn't" +
          "accept the shape anymore. This was done to avoid creating and " +
          "maintaining a plain javascript object and only rely on typescript." +
          "\nAs migration strategy, do this:" +
          "\n\nimport { createApplication, Api } from 'react-async-states';" +
          "\n\ntype MyAppType = { resource: { api: Api<TData, TArgs, tError> } };" +
          "\nconst app = createApplication<MyType>(undefined, context?);" +
          "\n\nIf you had an eager API, just inline this manually." +
          "\napp.eagerResource.eagerApi.define(producer, producerConfig);" +
          "\nOr group them into a single function that initialize all eager APIs" +
          "\n\nWhen v2 lands, this warning will be removed and createApplication " +
          "will only accept the optional 'context' parameter."
      );
    }
  }

  let app: Partial<App<TApp>> = {};

  return new Proxy(app as App<TApp>, {
    get(_: App<TApp>, property: string): any {
      let resourceName = property as keyof TApp;

      let existingResource = app[resourceName];
      if (existingResource) {
        return existingResource;
      }

      if (context) {
        createContext(context);
      }
      let resource = createResource<TApp, typeof resourceName>(
        resourceName,
        context
      );

      app[resourceName] = resource;
      return resource;
    },
  });
}

function createResource<TApp extends AppShape, TRes extends keyof App<TApp>>(
  resourceName: TRes,
  context?: object
): Resource<App<TApp>[TRes]> {
  let resource: Partial<Resource<TApp[TRes]>> = {};

  return new Proxy(resource as Resource<TApp[TRes]>, {
    get(_target: Resource<TApp[TRes]>, property: string): any {
      let apiName = property as keyof App<TApp>[TRes];

      let exitingApi = resource[property];
      if (exitingApi) {
        return exitingApi;
      }

      let api = createApi<TApp, TRes, typeof apiName>(
        resourceName,
        apiName,
        context
      );

      resource[apiName] = api;
      return api;
    },
  });
}

function createApi<
  TApp extends AppShape,
  TRes extends keyof App<TApp>,
  TApi extends keyof App<TApp>[TRes],
>(
  resourceName: TRes,
  apiName: TApi,
  context?: object
): TApp[TRes][typeof apiName] {
  type TData = InferData<TApp, TRes, TApi>;
  type TArgs = InferArgs<TApp, TRes, TApi>;
  type TError = InferError<TApp, TRes, TApi>;

  let source: Source<TData, TArgs, TError> | null = null;

  function token() {
    if (!source) {
      let path = `app.${String(resourceName)}.${String(apiName)}`;
      throw new Error(`Call ${path}.define(producer) before using ${path}`);
    }
    return source;
  }
  token.define = define;
  token.useData = (useDataForApp<TData, TArgs, TError>).bind(null, token);
  token.useAsync = (useAsyncForApp<TData, TArgs, TError>).bind(null, token);

  return token as TApp[TRes][typeof apiName];

  function define(
    producer: Producer<TData, TArgs, TError> | null,
    config?: ProducerConfig<TData, TArgs, TError>
  ) {
    if (!source) {
      let key = `${String(resourceName)}_${String(apiName)}`;
      let apiConfig = config;
      if (context !== null) {
        apiConfig = assign({}, apiConfig, { context });
      }
      source = createSource(key, producer, apiConfig);
    } else {
      source.replaceProducer(producer);
      source.patchConfig(config);
    }
    return token;
  }
}

function useDataForApp<TData, TArgs extends unknown[], TError>(
  token: Api<TData, TArgs, TError>,
  config?: UseConfig<TData, TArgs, TError>,
  deps?: any[]
) {
  let source = token();

  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }

  return useData_internal(source, deps || emptyArray, config);
}

function useAsyncForApp<TData, TArgs extends unknown[], TError>(
  token: Api<TData, TArgs, TError>,
  config?: UseConfig<TData, TArgs, TError>,
  deps?: any[]
) {
  let source = token();

  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }

  return useAsync_internal(source, deps || emptyArray, config);
}
