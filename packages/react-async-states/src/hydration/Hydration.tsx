import * as React from "react";
import {
  State,
  createContext,
  requestContext,
  HydrationData,
} from "async-states";
import {HydrationContext, isServer} from "./context";

declare global {
  interface Window {
    __ASYNC_STATES_HYDRATION_DATA__?: Record<string, HydrationData<any, any, any>>;
  }
}
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export default function Hydration({
  context,
  exclude,
  children
}: HydrationProps) {
  return (
    <HydrationProvider context={context}>
      {children}
      <HydrationExecutor context={context} exclude={exclude}/>
    </HydrationProvider>
  );
}

function HydrationProvider({context, children}) {
  createContext(context);

  return (
    <HydrationContext.Provider value={context}>
      {children}
    </HydrationContext.Provider>
  );
}

function parseInstanceHydratedData(identifier: string): {poolName?: string, key?: string} {
  let key: string | undefined = undefined;
  let poolName: string | undefined = undefined;

  if (identifier) {
    let matches = identifier.match(/(^.*?)__INSTANCE__(.*$)/);
    if (matches) {
      key = matches[2];
      poolName = matches[1];
    }
  }

  return {key, poolName};
}

function HydrationExecutor({context, exclude}) {

  React.useEffect(() => {
    let execContext = requestContext(context);
    if (!maybeWindow || !maybeWindow.__ASYNC_STATES_HYDRATION_DATA__) {
      return;
    }
    let savedHydrationData = maybeWindow.__ASYNC_STATES_HYDRATION_DATA__;
    if (typeof savedHydrationData !== "object") {
      return;
    }

    Object.entries(savedHydrationData)
      .forEach(([identifier, savedData]) => {
        let {poolName, key} = parseInstanceHydratedData(identifier);
        if (key && poolName && execContext.pools[poolName]) {
          let instance = execContext.pools[poolName].instances.get(key);
          if (instance) {
            instance.state = savedData.state;
            instance.payload = savedData.payload;
            instance.latestRun = savedData.latestRun;
            instance.replaceState(instance.state); // notifies subscribers

            delete savedHydrationData[identifier];
          }
        }
      });

    if (Object.keys(savedHydrationData).length === 0) {
      delete maybeWindow.__ASYNC_STATES_HYDRATION_DATA__;
    }

  }, [context]);

  if (!isServer) {
    return null;
  }
  let hydrationData = buildHydrationData(context, exclude);

  if (!hydrationData) {
    return null;
  }

  return <script dangerouslySetInnerHTML={{__html: hydrationData}}></script>;
}

export type HydrationProps = {
  context: any,
  exclude?: string | ((key: string, state: State<any>) => boolean),
  children?: any,
}

function buildHydrationData(
  context: any,
  exclude?: string | ((key: string) => boolean),
): string | null {

  let states: Record<string, HydrationData<any, any, any>> = flattenPools(
    context,
    exclude
  );
  if (!states || Object.keys(states).length === 0) {
    return null;
  }

  try {
    return `window.__ASYNC_STATES_HYDRATION_DATA__ = ${JSON.stringify(states)}`;
  } catch (e) {
    throw new Error("Error while serializing states", {cause: e});
  }
}

function flattenPools(
  context: any,
  exclude?: string | ((key: string, state: State<any>) => boolean),
): Record<string, HydrationData<any, any, any>> {

  return Object.values(requestContext(context).pools)
    .reduce((result, pool) => {
      let poolName = pool.name;
      pool.instances.forEach(instance => {

        if (
          exclude &&
          (
            typeof exclude === "function" && exclude(instance.key, instance.getState())
            ||
            typeof exclude === "string" && !(new RegExp(exclude).test(instance.key))
          )
        ) {
          return;
        }

        result[`${poolName}__INSTANCE__${instance.key}`] = {
          state: instance.state,
          latestRun: instance.latestRun,
          payload: instance.getPayload(),
        };
      });

      return result;
    }, {} as Record<string, HydrationData<any, any, any>>);
}
