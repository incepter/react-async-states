import React from "react";
import { HydrationData, LibraryContext, StateInterface } from "async-states";
import { InternalProviderDomProps } from "./context";

declare global {
  interface Window {
    __ASYNC_STATES_HYDRATION_DATA__?: Record<
      string,
      HydrationData<unknown, unknown[], unknown>
    >;
  }
}

export default function ProviderDom({
  id,
  context,
}: Readonly<InternalProviderDomProps>) {
  let existingHtml = React.useRef<string | null>(null);

  if (!existingHtml.current) {
    let existingContainer = document.getElementById(id);
    if (existingContainer) {
      existingHtml.current = existingContainer.innerHTML;
    }
  }

  React.useEffect(() => hydrateContext(context), [context]);

  let currentScript = existingHtml.current;

  if (currentScript !== null) {
    return (
      <script
        id={id}
        dangerouslySetInnerHTML={{ __html: currentScript }}
      ></script>
    );
  }

  return null;
}

function hydrateContext(currentContext: LibraryContext) {
  let allHydrationData = window.__ASYNC_STATES_HYDRATION_DATA__;

  // nothing to do
  if (typeof allHydrationData !== "object") {
    return;
  }

  // state id is of shape: pool__instance__key
  for (let [hydrationId, hydrationData] of Object.entries(allHydrationData)) {
    let { key } = parseInstanceHydratedData(hydrationId);
    if (key) {
      let instance: StateInterface<any, any, any> = currentContext.get(key)!;
      if (instance) {
        instance.state = hydrationData.state;
        instance.payload = hydrationData.payload;
        instance.latestRun = hydrationData.latestRun;
        instance.actions.replaceState(instance.state); // does a notification

        delete allHydrationData[hydrationId];
      }
    }
  }
}

function parseInstanceHydratedData(hydrationId: string): {
  key?: string;
} {
  let key: string | undefined = undefined;

  if (hydrationId) {
    let matches = RegExp(/__INSTANCE__(.*$)/).exec(hydrationId);
    if (matches) {
      key = matches[1];
    }
  }

  return { key };
}
