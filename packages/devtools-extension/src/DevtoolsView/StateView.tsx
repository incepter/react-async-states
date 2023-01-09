import React from "react";
import {
  currentView,
  gatewaySource,
  instanceDetails,
} from "./sources";
import Json from "./Json";
import {useSource, Status} from "react-async-states";
import {DevtoolsJournalEvent} from "async-states/dist/es/src/devtools";
import {humanizeDevFlags} from "react-async-states/dist/es/shared";
import {addFormattedDate, DevtoolsMessagesBuilder} from "./utils";

export default function StateView() {
  let {state: {data: currentId}} = useSource(currentView);
  if (!currentId) {
    return (
      <div className="state-view-unselected">
        <span className="state-view-unselected-span">Please select</span>
      </div>
    );
  }
  return <StateDetails id={currentId}/>
}

const emptyObject = {}

function StateDetails({id}) {
  let [displayedTabs, setDisplayedTabs] = React.useState<Record<string, boolean>>(emptyObject);
  let {state} = useSource(instanceDetails, id);

  if (!id || !state.data) {
    return (
      <div>
        <span>State not synced yet!</span>
      </div>
    );
  }

  let instance = state.data;
  let key = instance.key;

  return (
    <div className="state-view-root">
      <div className="state-view-header">
        <div className="state-view-header-change-state">
          <ChangeState key={id} displayKey={key} uniqueId={id}/>
        </div>
        <div className="state-view-header-actions">
          <button className="devtools-button" onClick={() => setDisplayedTabs(old => ({
            ...old,
            config: !old.config
          }))}>{displayedTabs.config ? 'Hide' : 'Show'} config
          </button>
          <button className="devtools-button" onClick={() => setDisplayedTabs(old => ({
            ...old,
            journal: !old.journal
          }))}>{displayedTabs.journal ? 'Hide' : 'Show'} journal
          </button>
        </div>
      </div>
      <div className="state-view-container">
        <div className="state-view-section">
          <Json name={`${key} - State`} src={instance.state}/>
        </div>
        {displayedTabs.config && (
          <div className="state-view-section">
            <Json name={`${key} - config`} level={4} src={{
              subscriptions: mapSubscriptions(instance.subscriptions),
              config: instance.config,
              cache: instance.cache,
            }}/>
          </div>
        )}
        {displayedTabs.journal && (
          <div className="state-view-section">
            <JournalDisplay uniqueId={id} journal={instance.journal}/>
          </div>
        )}
      </div>

    </div>
  );
}

function mapSubscriptions(subscriptions) {
  if (!subscriptions) {
    return subscriptions;
  }
  return subscriptions.map?.(t => ({
    ...t,
    devFlags: humanizeDevFlags(t.flags || 0),
  }));
}

const initialSelectedEvents = [
  DevtoolsJournalEvent.creation,
  DevtoolsJournalEvent.update,
];

function sortByEventIdDesc(ev1, ev2) {
  return ev2.eventId - ev1.eventId;
}


function formJournalEventJson(entry) {
  switch (entry.eventType) {
    case DevtoolsJournalEvent.update: {
      const {oldState, newState, lastSuccess} = entry.eventPayload;
      return {
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
        from: oldState.data,
        to: newState.data,
        oldState: addFormattedDate(oldState),
        newState: addFormattedDate(newState),
        lastSuccess: lastSuccess,
      };
    }
    case DevtoolsJournalEvent.run:
    case DevtoolsJournalEvent.dispose:
    case DevtoolsJournalEvent.creation:
    case DevtoolsJournalEvent.insideProvider: {
      return {
        eventId: entry.eventId,
        eventType: entry.eventType,
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
        payload: entry.eventPayload,
      };
    }
    case DevtoolsJournalEvent.subscription:
    case DevtoolsJournalEvent.unsubscription: {
      return {
        subscriptionKey: entry,
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
      };
    }
    default:
      return null;
  }
}

const JournalDisplay = function JournalDisplay({
  journal,
  uniqueId
}: { journal: any[], uniqueId: string }) {
  let [currentJournal, setCurrentJournal] = React.useState<any | null>(null);
  let allLogs = journal ?? [];
  let [selectedTypes, setSelectedTypes] = React.useState(initialSelectedEvents);

  let filteredData = React.useMemo(() => {
    return (allLogs
      ?.filter(t => selectedTypes.includes(t.eventType)) ?? [])
      .reduce((acc, t) => (acc[t.eventId] = t, acc), {});
  }, [journal, selectedTypes]);

  let filteredValues = Object.values(filteredData).sort(sortByEventIdDesc) as any[];

  React.useEffect(() => {
    if (!currentJournal && filteredValues[0]) {
      const entry = filteredValues[0];
      setCurrentJournal(entry.eventId);
    }
  }, [uniqueId, filteredValues]);

  // handel select or unselect selectType
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value: DevtoolsJournalEvent = e.target.value as DevtoolsJournalEvent;
    if (!selectedTypes.find((option: DevtoolsJournalEvent) => option === value)) {
      return setSelectedTypes([...selectedTypes, value])
    } else {
      return setSelectedTypes(selectedTypes.filter((option: DevtoolsJournalEvent) => option !== value))
    }
  }

  return (
    <div className="journal-root">
      <div className="scroll-y-auto">
        <div className="journal-filter">
          <span>Available: ({allLogs.length}), shown: ({filteredValues.length})</span>
          <div style={{display: "flex", gap: 4}}>
            <button className="devtools-button as-default-button"
                    onClick={() => setSelectedTypes([])}>Clear all
            </button>
            <button className="devtools-button as-default-button"
                    onClick={() => setSelectedTypes(Object.values(DevtoolsJournalEvent))}
            >
              Select all
            </button>
          </div>
          <select
            multiple
            value={selectedTypes}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange(e)}
            style={{
              color: '#000',
              width: '100%',
              marginTop: 8,
              background: 'white',
              borderRadius: 5,
              outline: "none",
              minHeight: 100,
            }}>
            {
              // @ts-ignore
              Object.values(DevtoolsJournalEvent)?.map((t: string) => (
              <option key={t} value={t}>{t}</option>))}
          </select>
          <ul style={{marginTop: 8, paddingBottom: "1rem"}}>
            {filteredValues.map((entry) => (
              <li
                style={{width: "100%"}}
                key={entry.eventId}>
                <button
                  style={{
                    width: "100%",
                    borderRadius: 100,
                    padding: '3px 10px',
                    border: "none",
                  }}
                  className={`devtools-button as-default-button ${currentJournal === entry.eventId ? 'journal-button-active' : ''}`}
                  onClick={() => {
                    setCurrentJournal(entry.eventId)
                  }}>
                  {`› ${entry.eventType}`}
                </button>
              </li>
            ))}
          </ul>
        </div>

      </div>
      <div className="journal-content scroll-y-auto">
        {currentJournal && <Json level={1} name={`journal`}
                                 src={filteredData[currentJournal]}/>}
      </div>
    </div>
  );
};

function ChangeState({uniqueId, displayKey}) {
  let [open, setOpen] = React.useState(false);
  let [isJson, setIsJson] = React.useState(true);
  let [data, setData] = React.useState<string | null>("");
  let [status, setStatus] = React.useState(Status.success);

  return (
    <>
      <button className="devtools-button" onClick={() => setOpen(true)}>Change state</button>
      {open && (
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
              className="devtools-button "
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
                  const value = e.target.value as Status;
                  setStatus(value);
                  if (value === Status.pending) {
                    setData(null);
                  }
                }}
              >
                {Object.values(Status as Record<string, string>).map((t) => (
                  <option value={t}>{t}</option>
                ))}
              </select>
              {status !== Status.pending && (
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
                    lane={uniqueId}
                    onChange={setData}
                  />
								</span>
                </section>
              )}
              <details>
                <summary>Preview:</summary>

                <Json level={1} name={`${displayKey} - new state`} src={{
                  status,
                  data: isJson ? formatData(data) : data,
                }}/>
              </details>
            </section>
          </div>
          <hr/>
          <footer style={{
            marginTop: 20,
            marginBottom: 10,
            display: "flex",
            justifyContent: 'end',
            gap: 5
          }}>
            <button className="devtools-button" style={{
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
            <button className="devtools-button" style={{
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
                          uniqueId,
                          status,
                          data,
                          isJson,
                          gatewaySource.getPayload().dev
                        )
                      );
                      setOpen(false);
                    }}

            >Save
            </button>
          </footer>
        </div>
      )}
    </>
  );
}

const PreviewsStateChoice = React.memo(PreviewsStateChoiceDefault);

function PreviewsStateChoiceDefault({
  lane,
  onChange,
}: {
  lane: string;
  onChange: Function;
  status: any;
}) {
  const {state} = useSource(instanceDetails, lane);
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

function stringifyForSelect(data) {
  if (typeof data === "string") {
    return data;
  }
  if (typeof data === "object" && data !== null) {
    return JSON.stringify(data);
  }
  return data;
}
