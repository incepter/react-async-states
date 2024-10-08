import * as React from "react";
import type {
  LibraryContext,
  Source,
  SourceHydration,
  State,
} from "async-states";
import { createContext } from "async-states";
import { Context, isServer } from "./context";
import { __DEV__, isFunction } from "../shared";

declare global {
  interface Window {
    // force rehydration
    __$$_H?: (name: string) => void;
    __$$?: Record<string, SourceHydration<any, any, any>>;
  }
}

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
  let reactId = React.useId();
  let parentLibraryProvider = React.useContext(Context);

  let libraryContextObject: LibraryContext = React.useMemo(() => {
    if (!contextArg && contextArg !== null) {
      if (parentLibraryProvider) {
        return parentLibraryProvider;
      }

      let libraryContext = createContext({});
      libraryContext.name = `__$$${reactId}`;
      return libraryContext;
    }

    let libraryContext = createContext(contextArg);
    if (contextArg !== null) {
      libraryContext.name = `__$$${reactId}`;
    } else if (isServer) {
      throw new Error("Global context cannot be used server");
    }
    return libraryContext;
  }, [reactId, contextArg]);

  if (isFunction(serverInsertedHtmlHook)) {
    serverInsertedHtmlHook(() => (
      <HydrateRemainingContextInstances
        exclude={exclude}
        context={libraryContextObject}
      />
    ));
  }
  React.useEffect(
    () => ensureOnDemandHydrationExistsInClient(libraryContextObject),
    [libraryContextObject]
  );

  // memoized children will unlock the React context children optimization:
  // if the children reference is the same as the previous render, it will
  // bail out and skip the children render and only propagates the context
  // change.
  return (
    <Context.Provider value={libraryContextObject}>{children}</Context.Provider>
  );
}

function ensureOnDemandHydrationExistsInClient(
  libraryContextObject: LibraryContext
) {
  let ctxName = libraryContextObject.name;
  let hydrationDataPropName = !ctxName ? "__$$" : ctxName;
  let rehydrationFunctionName = !ctxName ? "__$$_H" : `${ctxName}_H`;

  window[rehydrationFunctionName] = function rehydrateContext() {
    let hydrationData: HydrationRecord = window[hydrationDataPropName];
    if (!hydrationData || !libraryContextObject) {
      return;
    }

    Object.entries(hydrationData).forEach(([key, instanceHydration]) => {
      let instance = libraryContextObject.get(key);

      if (!instance || !instanceHydration) {
        return;
      }

      let [state, latestRun, payload] = instanceHydration;

      instance.version += 1;
      instance.state = state;
      let promise = instance.promise;

      // next, we may have already hydrated the "pending" state, in this case
      // we put a never resolving promise and it probably did suspend a tree
      // in this case, we will resolve/reject it imperatively because
      // we keep track of this value.
      // setting state won't resolve because if this is the first ever component
      // render and mount, it won't run any effects and thus no subscribers.
      // so, the only way is to inform react that the suspending promise did
      // fulfill, via its resolve and reject functions.
      if (state.status === "success") {
        instance.lastSuccess = state;
        if (promise) {
          promise.value = state.data;
          promise.status = "fulfilled";
        }
        instance.res?.res(state.data);
      } else if (state.status === "error" && promise) {
        promise.status = "rejected";
        promise.reason = state.data;
        instance.res?.rej(state.data);
      }
      instance.payload = payload;
      instance.latestRun = latestRun;

      let subscriptions = instance.subscriptions;
      if (subscriptions) {
        Object.values(subscriptions).forEach((sub) => sub.props.cb(state));
      }

      delete hydrationData[key];
    });
  };
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

type HydrationClientRef = {
  init: boolean;
  html: string | null;
};

function HydrationClient(_props: HydrationComponentProps) {
  let reactId = React.useId();
  let id = `${idPrefix}${reactId}`;
  let existingHtml = React.useMemo<{ current: HydrationClientRef }>(
    () => ({ current: { html: null, init: false } }),
    []
  );

  // We are using the "init" property explicitly to be more precise:
  // If we didn't compute, let's do it, or else, just pass.
  // In the or else path, it may be difficult to distinguish between falsy
  // values and we would end up using two values anyways. So, we better use
  // an object to be more explicit and readable.
  // For example, we could do:
  // if (existingHTML.current === null) ...
  // But there is no guarantee that the innerHTML computation will always yield
  // non null values. To avoid all of that, let's stick to basic javascript.
  if (!existingHtml.current.init) {
    let container = document.getElementById(id);
    let containerInnerHTML = container?.innerHTML ?? null;
    existingHtml.current = { init: true, html: containerInnerHTML };
  }

  let __html = existingHtml.current.html;

  if (__html) {
    return <script id={id} dangerouslySetInnerHTML={{ __html }}></script>;
  }
  return null;
}

type HydrationRecord = Record<string, SourceHydration<any, any, any>>;

function buildWindowAssignment(
  sources: Source<any, any, any>[],
  context: LibraryContext
) {
  if (!sources.length) {
    return null;
  }

  let globalHydrationData: HydrationRecord | null = null;
  let contextHydrationData: HydrationRecord | null = null;

  for (let source of sources) {
    let key = source.key;
    let instance = context.get(key);
    if (!instance) {
      if (__DEV__) {
        __DEV__warnInDevAboutHydratingSourceNotInContext(key);
      }
      throw new Error("Cannot leak server global source");
    }

    let { state, latestRun, payload, version } = instance;
    if (context.payload[key] === version) {
      continue;
    } else {
      context.payload[key] = version;
    }

    // instance.global is true only and only if this instance was cloned
    // from a server instance:
    // ie: You have a global source object in the server, that you clone per
    // request. When we perform this clone, we mark these sources as global:
    // It was cloned from a globally accessible source.
    // We do all of this because when hydrating, there are two types of states:
    // Those we were global (not related to this render, but more of was
    // created far away and a subscription is performed from this render),
    // and those we are bound to the current Context in this particular render.
    // When hydrating we distinguish between them so we won't leak source state
    // and we properly assign the state to its instance.
    // The script will later use __$$ for global context, and <context.name>
    // for more granular contexts.
    // When using the server, using a context is mandatory, but if your app
    // is all global sources, then contextHydrationData will be basically empty
    // and your global sources in the client will get hydrated correctly.
    if (instance.global) {
      if (!globalHydrationData) {
        globalHydrationData = {};
      }
      globalHydrationData[key] = [state, latestRun, payload];
    } else {
      if (!contextHydrationData) {
        contextHydrationData = {};
      }
      contextHydrationData[key] = [state, latestRun, payload];
    }
  }

  if (!globalHydrationData && !contextHydrationData) {
    return null;
  }

  let hydrationData = ["var win=window;"];
  if (globalHydrationData) {
    let globalHydrationDataAsString = JSON.stringify(globalHydrationData);
    hydrationData.push(
      buildHydrationScriptContent("__$$", globalHydrationDataAsString)
    );
  }

  if (contextHydrationData) {
    let contextName = context.name;
    if (!contextName) {
      throw new Error("Hydrating context without name, this is a bug");
    }

    let contextHydrationDataAsString = JSON.stringify(contextHydrationData);
    hydrationData.push(
      buildHydrationScriptContent(contextName, contextHydrationDataAsString)
    );
  }

  return hydrationData.join("");
}

function buildHydrationScriptContent(propName: string, data: string) {
  return `win["${propName}"]=Object.assign(win["${propName}"]||{},${data});win["${propName}_H"]&&win["${propName}_H"]();`;
}

function __DEV__warnInDevAboutHydratingSourceNotInContext(key: string) {
  if (__DEV__) {
    console.error(
      `[async-states] source '${key}' doesn't exist` +
        " in the context, this means that you tried to hydrate it " +
        " before using it via hooks. Only hydrate a source after using it" +
        " to avoid leaks and passing unused things to the client."
    );
  }
}
