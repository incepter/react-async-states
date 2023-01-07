import * as React from "react";
import {__DEV__} from "./shared";
import {getOrCreatePool} from "async-states";

let didWarnAboutProviderDeprecated = false;
/**
 * The provider will be removed in the next stable release
 * don't rely on it as it only causes errors and this part will
 * be delegated completely outside React
 */
export function AsyncStateProvider(
  {
    payload,
    children,
  }: any) {
  if (__DEV__) {
    if (!didWarnAboutProviderDeprecated) {
      console.error(`[Deprecation Warning] The provider is deprecated and does nothing
            If you were using it, please use Pools instead which won't require
            any React component from your at all.
            
            For all states that were given to the provider, simply use source
            or define them using a unique key and access them anywhere.
            
            If you were using multiple providers, use Pools instead.
            
            Pools documentation: #todo
            `);
      didWarnAboutProviderDeprecated = true;
    }
  }

  // this should synchronously change the payload held by hoisted items
  // why not until effect? because all children may benefit from this in their
  // effects
  React.useMemo<void>(() => {
    getOrCreatePool().mergePayload(payload);
  }, [payload]);

  return children;
}

