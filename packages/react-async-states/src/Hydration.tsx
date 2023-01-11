import * as React from "react";
import {State, createContext, requestContext,HydrationData} from "async-states";


let maybeWindow = typeof window !== "undefined" ? window : undefined;
let isServer = !maybeWindow || !maybeWindow.document || !maybeWindow.document.createComment;

export default function Hydration({
  context,
  exclude,
  children
}: HydrationProps) {
  return (
    <HydrationProvider context={context}>
      {children}
      <HydrationExecutor context={context} exclude={exclude} />
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

function HydrationExecutor({context, exclude}) {
  if (!isServer) {
    return null;
  }
  let hydrationData = buildHydrationData(context, exclude);

  if (!hydrationData) {
    return null;
  }

  return <script dangerouslySetInnerHTML={{__html: hydrationData}}></script>;
}

export function useExecutionContext() {
  let hydrationContext = React.useContext(HydrationContext);
  if (!hydrationContext && isServer) {
    throw new Error("HydrationContext not found in the server.");
  }
  if (!hydrationContext) {
    return requestContext(null);
  }

  return requestContext(hydrationContext);
}
export let HydrationContext = React.createContext<any | null>(null);

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

        if (exclude) {
          if (typeof exclude === "function" && exclude(instance.key, instance.getState())) {
            return;
          } else if (typeof exclude === "string" && !(new RegExp(exclude).test(instance.key))) {
            return;
          }
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
