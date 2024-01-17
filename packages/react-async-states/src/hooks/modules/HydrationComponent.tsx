import * as React from "react";
import { Source } from "async-states";
import { isServer } from "../../provider/context";

type HydrationComponentProps = {
  target: Source<any, any, any>[];
};

export default function HydrationComponent(props: HydrationComponentProps) {
  if (isServer) {
    return <HydrationServer target={props.target} />;
  }
  return <HydrationClient target={props.target} />;
}

let idPrefix = "$$as-";

function HydrationServer(props: HydrationComponentProps) {
  let reactId = React.useId();
  let hydrationData = buildWindowAssignment(props.target);
  if (!hydrationData) {
    return null;
  }
  return (
    <script
      id={`${idPrefix}${reactId}`}
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

function HydrationClient(props: HydrationComponentProps) {
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

function buildWindowAssignment(sources: Source<any, any, any>[]) {
  if (!sources.length) {
    return null;
  }
  let data = sources.reduce((acc, curr) => {
    let instance = curr.inst;
    acc[curr.key] = [instance.state, instance.latestRun, instance.payload];
    return acc;
  }, {});

  let hydrationAsString = JSON.stringify(data);
  return `window.__$$_HD=Object.assign(window.__$$_HD||{},${hydrationAsString})`;
}
