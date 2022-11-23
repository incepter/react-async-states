import React from "react";
import ReactJson from "react-json-view";
import {AsyncStateStatus, useSource, useSourceLane} from "react-async-states";
import {DevtoolsJournalEvent} from "react-async-states/dist/devtools";
import {
  currentJournal,
  currentState,
  gatewaySource,
  journalSource,
} from "./sources";
import {addFormattedDate, DevtoolsMessagesBuilder} from "./utils";
import CurrentJournalDisplay from "./CurrentJournalDisplay";
import {DevtoolsContext} from "./context";

function CurrentJsonDisplay({
  lane,
  mode,
}: {
  lane: string;
  mode: "state" | "journal";
}) {
  if (mode === "state") {
    return <StateView lane={lane}/>;
  }
  if (mode === "journal") {
    return <CurrentJournalDisplay key={lane} lane={lane}/>;
  }
  return null;
}

function CurrentTreeDisplay() {
  const {state} = useSource(currentState);
  const {data: lane} = state;
  if (!lane) {
    return null;
  }
  return (
    <div style={{height: '100%'}}>
      <div
        style={{
          padding: 8,
          height: 40,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px dashed #C3C3C3",
        }}
        className="main-bg"
      >
        <Actions lane={lane}/>
      </div>
      <div
        style={{
          height: "auto",
          display: "flex",
        }}
      >
        <div
          style={{
            borderRight: "1px dashed #C3C3C3",
          }}
          className="main-bg"
        >
          <CurrentJsonDisplay lane={lane} mode="state"/>
        </div>
        <div
          style={{
            overflow: "auto",
          }}
          className="main-bg scroll-y-auto"
        >
          <CurrentJsonDisplay lane={lane} mode="journal"/>
        </div>
      </div>
    </div>
  );
}

type SiderDisplayProps = {
  uniqueId: number;
  asyncStateKey: string;
  isCurrent: boolean;
  level?: number;
  lanes?: string;
};

function getBackgroundColorFromStatus(status: AsyncStateStatus | undefined) {
  switch (status) {
    case AsyncStateStatus.error:
      return "#EB6774";
    case AsyncStateStatus.initial:
      return "#DEDEDE";
    case AsyncStateStatus.aborted:
      return "#787878";
    case AsyncStateStatus.pending:
      return "#5B95DB";
    case AsyncStateStatus.success:
      return "#17A449";
    default:
      return undefined;
  }
}

function getColorFromStatus(status: AsyncStateStatus | undefined) {
  switch (status) {
    case AsyncStateStatus.error:
      return "white";
    case AsyncStateStatus.initial:
      return "black";
    case AsyncStateStatus.aborted:
      return "white";
    case AsyncStateStatus.pending:
      return "white";
    case AsyncStateStatus.success:
      return "white";
    default:
      return undefined;
  }
}

export const SideKey = React.memo(function SiderKey({
  uniqueId,
  asyncStateKey,
  isCurrent,
  level = 0,
  lanes,
}: SiderDisplayProps) {
  const {dev} = React.useContext(DevtoolsContext);

  React.useEffect(() => {
    gatewaySource
      .getState()
      .data?.postMessage?.(
      DevtoolsMessagesBuilder.getAsyncState(uniqueId, dev)
    );
  }, [uniqueId, dev]);

  const {state} = useSourceLane(journalSource, `${uniqueId}`);

  const {status} = state.data?.state ?? {};

  if (!lanes?.length) {
    return (
      <button
        className={`default-button`}
        style={{
          border: "none",
          borderRadius: 100,
          marginLeft: level * 30,
          color: isCurrent ? "white" : "#00bbff",
          backgroundColor: isCurrent ? "#0059ff" : "transparent",
          width: level === 0 ? "100%" : `calc(100% - ${level * 30}px)`,
        }}
        onClick={() => {
          currentJournal.setState(null);
          currentState.setState(`${uniqueId}`);
        }}
        disabled={status === AsyncStateStatus.pending}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
					<span
            style={{marginLeft: 8}}
            title={`${asyncStateKey} (id: ${uniqueId})`}
          >{`› ${asyncStateKey}`}</span>
          {status !== undefined && (
            <div
              title={status}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: getBackgroundColorFromStatus(status),
              }}
            ></div>
          )}
        </div>
      </button>
    );
  }

  return (
    <>
      <button
        className={`default-button`}
        style={{
          border: "none",
          borderRadius: 100,
          color: isCurrent ? "white" : "#00bbff",
          backgroundColor: isCurrent ? "#0059ff" : "transparent",
          marginLeft: level * 30,
          width: level === 0 ? "100%" : `calc(100% - ${level * 30}px)`,
        }}
        onClick={() => {
          currentJournal.setState(null);
          currentState.setState(`${uniqueId}`);
        }}
        disabled={status === AsyncStateStatus.pending}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
					<span
            style={{marginLeft: 8}}
            title={`${asyncStateKey} (id: ${uniqueId})`}
          >{`› ${asyncStateKey}`}</span>
          {status !== undefined && (
            <div
              title={status}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: getBackgroundColorFromStatus(status),
              }}
            ></div>
          )}
        </div>
      </button>
      <SiderLanes lanes={lanes} level={level + 1}/>
    </>
  );
});

function SiderLanes({lanes, level}) {
  const {
    state: {data: lane},
  } = useSource(currentState);
  return lanes.map(([id, key]) => (
    <SideKey
      key={key}
      uniqueId={id}
      asyncStateKey={key}
      isCurrent={lane === id}
      level={level}
    />
  ));
}

function StateView({lane}) {
  const {state} = useSourceLane(journalSource, lane);
  if (!state.data) {
    return (
      <div>
        <span>No state information</span>
        <RefreshButton lane={lane}/>
      </div>
    );
  }

  const {data} = state;

  if (!data.key) {
    return <span>No state information</span>;
  }
  return (
    <div style={{height: '100%'}} className="scroll-y-auto">
      <ReactJson name={`${data.key}'s state`}
                 style={{
                   padding: "1rem",
                   overflow: "auto"
                 }}
                 theme="solarized"
                 collapsed={5}
                 displayDataTypes={false}
                 displayObjectSize={false}
                 enableClipboard={false}
                 src={addFormattedDate(data.state)}
      />
      <hr/>
      <ReactJson name={data.key}
                 style={{
                   padding: "1rem",
                   overflow: "auto"
                 }}
                 theme="solarized"
                 collapsed={1}
                 displayDataTypes={false}
                 displayObjectSize={false}
                 enableClipboard={false}
                 src={displayAsyncState(data)}
      />
    </div>
  );
}

function displayAsyncState(data) {
  const output = {
    key: data.key,
    uniqueId: data.uniqueId,
    producerType: displayProducerType(data.producerType),
    state: addFormattedDate(data.state),
    subscriptions: data.subscriptions,
    lastSuccess: data.lastSuccess,

    lanes: data.lanes,
    cache: data.cache,
    parent: data.parent,
    config: data.config,
  };
  const {oldState} = data;
  if (oldState) {
    // @ts-ignore
    output.oldState = addFormattedDate(oldState);
  }
  return output;
}

function displayProducerType(value) {
  switch (value) {
    case 0:
      return "indeterminate";
    case 1:
      return "sync";
    case 2:
      return "promise";
    case 3:
      return "generator";
    case 4:
      return "not provided";
  }
  return null;
}

function RefreshButton({lane}) {
  const {dev} = React.useContext(DevtoolsContext);
  return (
    <button
      style={{
        color: "#00bbff",
        backgroundColor: "transparent",
        borderRadius: 100,
        border: "none",
      }}
      className="default-button"
      onClick={() => {
        gatewaySource
          .getState()
          .data?.postMessage?.(
          DevtoolsMessagesBuilder.getAsyncState(lane, dev)
        );
      }}
    >
      Refresh
    </button>
  );
}

const Actions = React.memo(function Actions({lane}: { lane: string }) {
  return (
    <>
      <RefreshButton lane={lane}/>

      <EditState key={lane} lane={lane}/>

      <button
        style={{
          color: "#00bbff",
          backgroundColor: "transparent",
          borderRadius: 100,
          marginLeft: 8,
          border: "none",
        }}
        className="default-button"
        onClick={() => {
          currentJournal.setState(null);
          currentState.setState(null);
        }}
      >
        {" "}
        Close
      </button>
    </>
  );
});

function EditState({lane}) {
  const [open, setOpen] = React.useState(false);
  const {dev} = React.useContext(DevtoolsContext);
  const [isJson, setIsJson] = React.useState(true);
  const [data, setData] = React.useState<string | null>("");
  const [status, setStatus] = React.useState(AsyncStateStatus.success);
  return (
    <>
      <button
        style={{
          color: "#00bbff",
          backgroundColor: "transparent",
          borderRadius: 100,
          marginLeft: 8,
          border: "none",
        }}
        onClick={() => setOpen(true)}
        className="default-button"
      >
        Change state
      </button>
      <div
        style={{
          color: "#000",
          padding: 15,
          width: 500,
          display: open ? "inline-block" : "none",
          position: "fixed",
          backgroundColor: "#fff",
          height: "fit-content",
          top: "50%",
          left: "50%",
          zIndex: 99,
          transform: "translate(-50%, -50%)",
          maxHeight: 650,
          overflow: "auto"
        }}
      >
        <header
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 0,
            marginBottom: 10,
          }}
        >
          <h1 style={{margin: 0}}>Change state</h1>
          <button
            style={{
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontSize: 24,
              cursor: "pointer",
            }}
            onClick={() => setOpen(false)}
          >
            x
          </button>
        </header>
        <hr/>
        <div style={{
          width: '100%',
          padding: 0,
          margin: '30px 0',
        }}>
          {open && (
            <section style={{margin: "0px 8px"}}>
              <label style={{fontWeight: 600}}>Status:</label>
              <select
                style={{
                  border: "1px solid black",
                  borderRadius: 5,
                  margin: 2,
                }}
                id="next-status"
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const value = e.target.value as AsyncStateStatus;
                  setStatus(value);
                  if (value === AsyncStateStatus.pending) {
                    setData(null);
                  }
                }}
              >
                {Object.values(AsyncStateStatus).map((t) => (
                  <option value={t}>{t}</option>
                ))}
              </select>
              {status !== AsyncStateStatus.pending && (
                <section
                  style={{
                    padding: "4px 0px",
                  }}
                >
                  <h4>Data:</h4>
                  <span>
									Type data and choose if it should be parsed as json.
									<br/>
								</span>
                  <textarea
                    style={{
                      border: "1px solid black",
                      borderRadius: 5,
                      margin: '2px 0',
                      maxWidth: "100%",
                    }}
                    rows={2}
                    value={data ?? ""}
                    onChange={(e) => setData(e.target.value)}
                  ></textarea>
                  <br/>
                  <input
                    id="is-json"
                    type="checkbox"
                    checked={isJson}
                    onChange={(e) => setIsJson(e.target.checked)}
                  />
                  <label style={{marginLeft: 16}} htmlFor="is-json">
                    is JSON data
                  </label>
                  <br/>
                  <span>
									You can choose preview states from here:
									<br/>
									<PreviewsStateChoice
                    status={status}
                    onChange={setData}
                    lane={lane}
                  />
								</span>
                </section>
              )}
              <details>
                <summary>Preview:</summary>

                <ReactJson
                  name="New state"
                  style={{
                    padding: "1rem",
                  }}
                  theme="solarized"
                  collapsed={2}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={false}
                  src={{
                    status,
                    data: isJson ? formatData(data) : data,
                  }}
                />
              </details>
            </section>
          )}
        </div>
        <hr/>
        <footer style={{
          marginTop: 20,
          marginBottom: 10,
          display: "flex",
          justifyContent: 'end',
          gap: 5
        }}>
          <button style={{
            backgroundColor: '#fff',
            color: '#0095ff',
            padding: '5px 17px',
            borderRadius: 5,
            border: "1px solid #069",
            outline: "none",
            cursor: "pointer"
          }}
                  onClick={() => setOpen(false)}
          >Cancel
          </button>
          <button style={{
            backgroundColor: '#0095ff',
            color: '#fff',
            padding: '5px 17px',
            borderRadius: 5,
            border: "1px solid #069",
            outline: "none",
            cursor: "pointer"
          }}
                  onClick={() => {
                    gatewaySource
                      .getState()
                      .data?.postMessage?.(
                      DevtoolsMessagesBuilder.changeAsyncState(
                        lane,
                        status,
                        data,
                        isJson,
                        dev
                      )
                    );
                    setOpen(false);
                  }}

          >Save
          </button>
        </footer>
      </div>
    </>
  );
}

function PreviewsStateChoiceDefault({
  lane,
  onChange,
}: {
  lane: string;
  onChange: Function;
  status: any;
}) {
  const {state} = useSourceLane(journalSource, lane);
  const updateEvents = (state.data?.journal ?? [])
    .filter((t) => t.eventType === DevtoolsJournalEvent.update)
    .reverse();

  return (
    <details>
      <summary>Choose from previous states</summary>
      <select
        style={{
          border: "1px solid black",
          borderRadius: 5,
          margin: 2,
          width: "100%",
          height: 40,
        }}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const data =
            e.target.options[e.target.options.selectedIndex]?.dataset.data ??
            "";
          onChange(
            stringifyForSelect(JSON.parse(data)?.eventPayload?.newState?.data)
          );
        }}
      >
        {updateEvents.map((t) => (
          <option
            style={{
              padding: "10px 5px",
            }}
            data-data={JSON.stringify(t)}
            key={t?.eventId}
            value={`${t?.eventId}`}
          >
            {`${t?.eventPayload?.newState?.status} - ${stringifyForSelect(
              t?.eventPayload?.newState?.data
            )}`}
          </option>
        ))}
      </select>
    </details>
  );
}

function formatData(data) {
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
}

const CurrentStateDisplay = React.memo(CurrentTreeDisplay);
const PreviewsStateChoice = React.memo(PreviewsStateChoiceDefault);

export default CurrentStateDisplay;

function stringifyForSelect(data) {
  if (typeof data === "string") {
    return data;
  }
  if (typeof data === "object" && data !== null) {
    return JSON.stringify(data);
  }
  return data;
}
