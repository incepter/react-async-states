import * as React from "react";
import {ownLibraryPools, State, HydrationData} from "async-states";
import {RunTask} from "async-states/src/types";


let maybeWindow = typeof window !== "undefined" ? window : undefined;
let isServer = !maybeWindow || !maybeWindow.document || !maybeWindow.document.createComment;


export default function Hydration() {
  // hydration will be only relevant if performed on server
  if (!isServer) {
    return null;
  }

  let hydrationData = buildHydrationData();
  if (!hydrationData) {
    return null;
  }
  return (<script dangerouslySetInnerHTML={{__html: hydrationData}}></script>)
}


function buildHydrationData(): string | null {
  let states: Record<string, HydrationData<any, any, any>> = flattenPools();
  if (!states || Object.keys(states).length === 0) {
    return null;
  }

  try {
    return `window.__ASYNC_STATES_HYDRATION_DATA__ = ${JSON.stringify(states)}`;
  } catch (e) {
    throw new Error("Error while serializing states", {cause: e});
  }
}

function flattenPools(): Record<string, HydrationData<any, any, any>> {
  return Object.values(ownLibraryPools)
    .reduce((result, pool) => {
      let poolName = pool.name;
      pool.instances.forEach(instance => {
        result[`${poolName}__INSTANCE__${instance.key}`] = {
          state: instance.state,
          latestRun: instance.latestRun,
          payload: instance.getPayload(),
        };
      });

      return result;
    }, {} as Record<string, HydrationData<any, any, any>>);
}
