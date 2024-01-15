import * as React from "react";
import { AnyInstance } from "./NpmDevtools";
import { State, useAsync, useData } from "react-async-states";
import { useDevtoolsAgent } from "./Context";
import { devtoolsSubscriptionKey } from "./constants";
import JsonView, { Json } from "./Json";
import { Status } from "async-states";

export function CurrentInstanceDetails_Internal() {
  let agent = useDevtoolsAgent();
  let source = agent.current.actions;
  let { data: instance } = useData(source);
  if (instance === null) {
    return null;
  }
  return <InstanceDetails instance={instance} />;
}

export const CurrentInstanceDetails = React.memo(
  CurrentInstanceDetails_Internal
);

let options = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZoneName: "long",
} as Intl.DateTimeFormatOptions;
let formatter = new Intl.DateTimeFormat("en-US", options);
let detailsSubKey = `${devtoolsSubscriptionKey}-details`;

type DetailsViews = {
  state: boolean;
  cache: boolean;
  config: boolean;
  journal: boolean;
  changeState: boolean;
};
let initialViews = {
  state: true,
  config: true,
  cache: false,
  journal: false,
  changeState: false,
};

function InstanceDetails({ instance }: { instance: AnyInstance }) {
  let [views, setViews] = React.useState<DetailsViews>(initialViews);

  return (
    <div className="asd-d-root">
      <div className="asd-d-h">
        <span>{instance.key}</span>
        <ViewsButtons views={views} setViews={setViews} />
      </div>
      {views.changeState && (
        <ChangeState
          key={instance.id}
          instance={instance}
          close={() => setViews((prev) => ({ ...prev, changeState: false }))}
        />
      )}
      <div className="asd-d-d">
        {views.state && <MemoizedStateView instance={instance} />}
        {views.config && <MemoizedConfig config={instance.config} />}
        {views.cache && <MemoizedCache instance={instance} />}
        {views.journal && <MemoizedJournal instance={instance} />}
      </div>
    </div>
  );
}

const ViewsButtons = React.memo(function ViewsButtons({
  views,
  setViews,
}: {
  views: DetailsViews;
  setViews: React.Dispatch<React.SetStateAction<DetailsViews>>;
}) {
  return (
    <>
      <button
        onClick={() => {
          setViews((prev) => ({ ...prev, state: !prev.state }));
        }}
        className={`${views.state ? "asd-d-h-b-active" : ""}`}
      >
        State
      </button>
      <button
        onClick={() => {
          setViews((prev) => ({ ...prev, config: !prev.config }));
        }}
        className={`${views.config ? "asd-d-h-b-active" : ""}`}
      >
        Config
      </button>
      <button
        onClick={() => {
          setViews((prev) => ({ ...prev, cache: !prev.cache }));
        }}
        className={`${views.cache ? "asd-d-h-b-active" : ""}`}
      >
        Cache
      </button>
      <button
        onClick={() => {
          setViews((prev) => ({ ...prev, journal: !prev.journal }));
        }}
        className={`${views.journal ? "asd-d-h-b-active" : ""}`}
      >
        Journal
      </button>
      <button
        onClick={() => {
          setViews((prev) => ({ ...prev, changeState: !prev.changeState }));
        }}
        className={`${views.changeState ? "asd-d-h-b-active" : ""}`}
      >
        Change state
      </button>
    </>
  );
});

const MemoizedStateView = React.memo(function StateView({
  instance,
}: {
  instance: AnyInstance;
}) {
  let { state } = useAsync(
    {
      source: instance.actions,
      subscriptionKey: detailsSubKey,
    },
    [instance.actions]
  );
  let memoizedState = React.useMemo(() => {
    let output = {
      status: state.status,
      time: formatter.format(new Date(state.timestamp)),
      data: getStateData(state),
      props: state.props,
    } as any;
    if (state.status === "pending") {
      output.prev = state.prev;
    }
    let subscriptions = Object.keys(instance.subscriptions ?? {}).filter(
      (t) => !t.startsWith(devtoolsSubscriptionKey)
    );
    if (subscriptions.length) {
      output.subscriptions = subscriptions;
    }
    return output;
  }, [state]);
  return <JsonView src={memoizedState} name="State" />;
});

const MemoizedConfig = React.memo(function StateView({
  config,
}: {
  config: AnyInstance["config"];
}) {
  return <JsonView src={config} name="Config" />;
});

const MemoizedCache = React.memo(function MemoizedCache({
  instance,
}: {
  instance: AnyInstance;
}) {
  let [key, rerender] = React.useState(0);

  React.useEffect(() => {
    return instance.actions.on("cache-change", (newCache) => {
      rerender((prev) => prev + 1);
    });
  }, [instance]);

  let memoizedCache = React.useMemo(
    () => Object.assign({}, instance.cache),
    [key, instance]
  );
  return <Json src={memoizedCache} name="Cache" level={3} />;
});

const ChangeState = React.memo(function ChangeState({
  close,
  instance,
}: {
  close: () => void;
  instance: AnyInstance;
}) {
  let [status, setStatus] = React.useState<Status>("success");
  let textAreaRef = React.useRef<HTMLTextAreaElement>();

  let previousJournalOptions = instance.journal
    .map((t, id) => ({ ev: t, id }))
    ?.filter(
      (t) => t.ev.type === "update" && t.ev.payload.next.data !== undefined
    );
  let hasPreviousData = previousJournalOptions.length > 0;
  React.useEffect(() => {
    if (instance.lastSuccess.data) {
      textAreaRef.current.value = stringifyData(instance.lastSuccess.data);
    }
  }, [instance]);

  return (
    <div className="asd-c-s-root">
      <div>
        <label>Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <option value="initial">Initial</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div>
        <label>Data (JSON)</label>
        <textarea rows={8} ref={textAreaRef}></textarea>
      </div>

      {hasPreviousData && (
        <div>
          <details open>
            <summary>Fill from previous state</summary>
            <select
              defaultValue=""
              className="asd-c-s-prev"
              onChange={(e) => {
                let id = +e.target.value;
                let target = instance.journal![id];
                if (id > 0 && target) {
                  try {
                    textAreaRef.current.value = stringifyData(
                      target.payload.next.data
                    );
                  } catch (e) {
                    console.log("Cannot stringify state", e);
                  }
                }
              }}
            >
              <option value="">-- select --</option>
              {previousJournalOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.ev.payload.next.status}--
                  {stringifyData(ev.ev.payload.next.data)}
                </option>
              ))}
            </select>
          </details>
        </div>
      )}
      <div className="asd-c-s-a" style={{ flexDirection: "row" }}>
        <button
          className="asd-c-s-btn"
          onClick={() => {
            let dataToUse = JSON.parse(textAreaRef.current.value);
            // @ts-ignore
            instance.actions.setState(dataToUse, status);
          }}
        >
          Set State
        </button>
        <button
          className="asd-c-s-btn"
          onClick={() => {
            instance.actions.setState(null, "pending");
          }}
        >
          Set pending
        </button>
        <button className="asd-c-s-btn" onClick={() => close()}>
          Close
        </button>
      </div>
    </div>
  );
});

function stringifyData(data: any): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return "Error stringifying data";
  }
}

const MemoizedJournal = React.memo(function ChangeState({
  instance,
}: {
  instance: AnyInstance;
}) {
  return (
    <Json
      level={3}
      name="Journal"
      src={{ not: { implemented: { yet: false } } }}
    />
  );
});

function getStateData(state: State<any, any, any>) {
  if (state.status === "error") {
    if (typeof state.data?.toString === "function") {
      return state.data.toString();
    }
  }
  return state.data;
}
