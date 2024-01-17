import * as React from "react";
import type { LibraryContext, SourceHydration } from "async-states";
import { createContext, Source, State } from "async-states";
import { Context, isServer } from "./context";
import { isFunction } from "../shared";

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

  // memoized children will unlock the React context children optimization:
  // if the children reference is the same as the previous render, it will
  // bail out and skip the children render and only propagates the context
  // change.
  return (
    <Context.Provider value={libraryContextObject}>{children}</Context.Provider>
  );
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
  let data = sources.reduce((acc, curr) => {
    let instance = curr.inst;
    context.payload[instance.key] = instance.version;
    acc[curr.key] = [instance.state, instance.latestRun, instance.payload];
    return acc;
  }, {});

  let hydrationAsString = JSON.stringify(data);
  return `window.__$$_HD=Object.assign(window.__$$_HD||{},${hydrationAsString})`;
}
