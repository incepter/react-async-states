import * as React from "react";
import type { LibraryContext, SourceHydration } from "async-states";
import { createContext, requestContext, Source, State } from "async-states";
import { Context, isServer } from "./context";
import { __DEV__, isFunction } from "../shared";

export type ProviderProps = {
  context?: any;
  children?: any;

  // this is an optimization that would allow "injecting" server side html
  // in the dom, this would allow hydration. NextJs has this hook, so this
  // is like a first class support for NextJs or any framework using this
  // mechanism
  serverInsertedHtmlHook?: (cb: () => React.ReactNode) => void;
  exclude?:
    | string
    | ((key: string, state: State<unknown, unknown[], unknown>) => boolean);
};

let idPrefix = "$$as-";

export default function Provider({
  exclude,
  children,
  context: contextArg,
  serverInsertedHtmlHook,
}: Readonly<ProviderProps>) {
  // automatically reuse parent context when there is and no 'context' object
  // is provided
  let parentLibraryProvider = React.useContext(Context);

  // this object gets recomputed in the implementation providers, to avoid that
  // we reference it and pass it as prop
  let libraryContextObject: LibraryContext;
  if (parentLibraryProvider !== null && !contextArg) {
    libraryContextObject = parentLibraryProvider;
  } else {
    if (!contextArg && isServer) {
      contextArg = {};
    }
    libraryContextObject = createContext(contextArg ?? null);
  }

  if (isFunction(serverInsertedHtmlHook)) {
    serverInsertedHtmlHook(() => (
      <HydrateRemainingContextInstances
        exclude={exclude}
        context={libraryContextObject}
      />
    ));
  }
  React.useEffect(ensureOnDemandHydrationExistsInClient, []);

  // memoized children will unlock the React context children optimization:
  // if the children reference is the same as the previous render, it will
  // bail out and skip the children render and only propagates the context
  // change.
  return (
    <Context.Provider value={libraryContextObject}>{children}</Context.Provider>
  );
}

function ensureOnDemandHydrationExistsInClient() {
  if (!window.__$$_H) {
    window.__$$_H = function rehydrateExistingInstances(keys: string[]) {
      if (!keys?.length) {
        return;
      }
      let globalContext = requestContext(null);
      keys.forEach((key) => {
        let instance = globalContext.get(key);
        let instanceHydration = window.__$$_HD?.[key];

        if (!instance || !instanceHydration) {
          return;
        }

        let [state, latestRun, payload] = instanceHydration;

        instance.state = state;
        instance.payload = payload;
        instance.latestRun = latestRun;

        let subscriptions = instance.subscriptions;
        if (subscriptions) {
          Object.values(subscriptions).forEach((sub) => sub.props.cb(state));
        }
      });
    };
  }
}

type HydrationProps = {
  context: LibraryContext;
  exclude?:
    | string
    | ((key: string, state: State<unknown, unknown[], unknown>) => boolean);
};

function HydrateRemainingContextInstances({
  context,
  exclude,
}: HydrationProps) {
  let sources = context
    .getAll()
    .filter((instance) => {
      // this means we already hydrated this instance in this context with this
      // exact same version
      if (context.payload[instance.key] === instance.version) {
        return false;
      }

      if (isFunction(exclude)) {
        return !exclude(instance.key, instance.state);
      }

      return true;
    })
    .map((t) => t.actions);

  return (
    <HydrationServer useReactId={false} context={context} target={sources} />
  );
}

declare global {
  interface Window {
    // force rehydration
    __$$_H?: (keys: string[]) => void;
    __$$_HD?: Record<string, SourceHydration<any, any, any>>;
  }
}

type HydrationComponentProps = {
  target: Source<any, any, any>[];
};

export function HydrationComponent({ target }: HydrationComponentProps) {
  let context = React.useContext(Context);
  if (isServer) {
    return <HydrationServer context={context!} target={target} />;
  }
  return <HydrationClient target={target} />;
}
type HydrationComponentServerProps = {
  useReactId?: boolean;
  context: LibraryContext;
  target: Source<any, any, any>[];
};

function HydrationServer({
  context,
  target,
  useReactId,
}: HydrationComponentServerProps) {
  let reactId = React.useId();

  let hydrationData = buildWindowAssignment(target, context);
  if (!hydrationData) {
    return null;
  }
  let id = useReactId === false ? undefined : `${idPrefix}${reactId}`;
  return (
    <script
      id={id}
      dangerouslySetInnerHTML={{ __html: hydrationData }}
    ></script>
  );
}

let initRef = {
  html: null,
  init: false,
};
type HydrationClientRef = {
  init: boolean;
  html: string | null;
};

function HydrationClient(_props: HydrationComponentProps) {
  let reactId = React.useId();
  let id = `${idPrefix}${reactId}`;
  let existingHtml = React.useRef<HydrationClientRef>(initRef);

  if (!existingHtml.current.init) {
    let container = document.getElementById(id);
    existingHtml.current = { init: true, html: container?.innerHTML ?? null };
  }

  let __html = existingHtml.current.html;

  if (__html) {
    return <script id={id} dangerouslySetInnerHTML={{ __html }}></script>;
  }
  return null;
}

function buildWindowAssignment(
  sources: Source<any, any, any>[],
  context: LibraryContext
) {
  if (!sources.length) {
    return null;
  }
  let needToRehydrate: string[] = [];
  let data = sources.reduce((result, current) => {
    let key = current.key;
    let instance = context.get(key);

    if (!instance) {
      if (__DEV__) {
        console.error(
          `[async-states] source '${key}' doesn't exist` +
            " in the context, this means that you tried to hydrate it " +
            " before using it via hooks. Only hydrate a source after using it" +
            " to avoid leaks and passing unused things to the client."
        );
      }
      throw new Error("Cannot leak server global source");
    }

    let currentVersion = instance.version;
    let previouslyHydratedVersion: number = context.payload[key];

    if (
      previouslyHydratedVersion !== undefined &&
      previouslyHydratedVersion !== currentVersion
    ) {
      needToRehydrate.push(key);
    }

    context.payload[key] = instance.version;
    result[key] = [instance.state, instance.latestRun, instance.payload];
    return result;
  }, {});

  let hydrationAsString = JSON.stringify(data);
  let hydration = `window.__$$_HD=Object.assign(window.__$$_HD||{},${hydrationAsString});`;

  // need to rehydrate means that there are some instances that were hydrated
  // but their version changed, so we'd need to rehydrate them again and
  // notify their subscriptions if necessary.
  if (!needToRehydrate.length) {
    return hydration;
  }
  return (
    hydration +
    `window.__$$_H&&window.__$$_H(${JSON.stringify(needToRehydrate)});`
  );
}
