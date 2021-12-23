import React, { useRef } from "react";
import ReactJson from "react-json-view";
import { isEqual } from "lodash";
import { DevtoolsContextProvider, useDevtoolsContext } from "./context/DevtoolsContext";
import "./index.v2.css";
import DevtoolsViewTypes from "./domain/DevtoolsViewTypes";
import { useAsyncState } from "react-async-states";
import { EMPTY_ARRAY } from "shared";

export default function App() {
  let port = useRef();
  const {run} = useAsyncState({
    key: "devtools",
    rerenderStatus: {pending: false, success: false, aborted: false}
  });

  React.useEffect(function subscribeToPort() {
    port.current = window.chrome.runtime.connect({name: "panel"});

    port.current.postMessage({
      type: "init",
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    });

    port.current.onMessage.addListener(message => {
      if (message.source !== "async-states-agent") {
        return;
      }
      run(message);
    });

    port.current.postMessage({
      type: "get-provider-state",
      source: "async-states-devtools-panel"
    });
  }, []);

  return (
    <DevtoolsContextProvider>
      <button onClick={() => port.current.postMessage({
        type: "get-provider-state",
        source: "async-states-devtools-panel"
      })}>Resync provider
      </button>
      <div className="main">
        <div className="sidebar-container">
          <Sidebar/>
        </div>
        <div className="content-container">
          <DevtoolsView/>
        </div>
      </div>
    </DevtoolsContextProvider>
  );
}

function Sidebar() {
  const [view, setView] = useDevtoolsContext();
  return (
    <div className="sidebar">
      <button className={`sidebar-button ${DevtoolsViewTypes.overview === view ? 'sidebar-el-active' : ''}`}
              role="button" onClick={() => setView(DevtoolsViewTypes.overview)}>Overview
      </button>
      <button className={`sidebar-button ${DevtoolsViewTypes.journal === view ? 'sidebar-el-active' : ''}`}
              role="button" onClick={() => setView(DevtoolsViewTypes.journal)}>Journal
      </button>
    </div>
  );
}

function DevtoolsView() {
  const [view] = useDevtoolsContext();
  return (
    <div className="devtools-view-container h-full">
      {view === DevtoolsViewTypes.journal && <DevtoolsJournal/>}
      {view === DevtoolsViewTypes.overview && <DevtoolsOverview/>}
    </div>
  );
}

function useDevtoolsEntriesKeys() {
  return useAsyncState({
    key: "devtools",
    areEqual: isEqual,
    selector: s => Object
      .entries(s.data.value)
      .map(([uniqueId, as]) => ({uniqueId, key: as.key, status: as.status})),
  }).state;
}

function useDevtoolsEntry(uniqueId) {
  return useAsyncState({
    key: "devtools",
    areEqual: isEqual,
    selector: s => s.data.value?.[uniqueId],
  }).state;
}

function useDevtoolsEntryJournal(uniqueId) {
  return useDevtoolsEntry(uniqueId)?.journal;
}

function useDevtoolsEntryState(uniqueId) {
  return useDevtoolsEntry(uniqueId);
}

function DevtoolsJournal() {
  const [currentAsyncState, setCurrentAsyncState] = React.useState(EMPTY_ARRAY);

  const keys = useDevtoolsEntriesKeys();
  React.useEffect(() => {
    if (!keys) {
      setCurrentAsyncState(EMPTY_ARRAY);
    }
  }, [keys]);
  return (
    <div className="h-full">
      <h1>Devtools journal</h1>
      <div className="flex h-full">
        <div className="sidebar-container">
          <div className="sidebar">
            {(keys ?? []).map(({uniqueId, key, status}) =>
              <button key={uniqueId}
                      className={`sidebar-button ${uniqueId === currentAsyncState[0] ? 'sidebar-el-active' : ''}`}
                      role="button" onClick={() => setCurrentAsyncState([uniqueId, key])}>{key}-{status}
              </button>
            )}
          </div>
        </div>
        <div className="content-container">
          {currentAsyncState.length &&
          <AsyncStateJournal key={currentAsyncState[0]} identifier={currentAsyncState}/> || null}
        </div>
      </div>
    </div>
  );
}

function AsyncStateJournal({identifier: [id, key]}) {
  const [currentJournal, setCurrentJournal] = React.useState(null);
  const journal = useDevtoolsEntryJournal(id);
  return (
    <div className="flex">
      <div className="sidebar-container">
        <div className="sidebar o-auto">
          {journal.map((evt, index) => (
            <button key={`${evt.eventDate}-${evt.eventType}-${index}`}
                    className={`sidebar-button ${evt === currentJournal ? 'sidebar-el-active' : ''}`}
                    role="button" onClick={() => setCurrentJournal(evt)}>{evt.eventType}
            </button>
          ))}
        </div>
      </div>
      <div style={{width: "80%"}}>
        {currentJournal && <ReactJson name={`${key} - ${currentJournal.eventType}`}
                                      style={{padding: "1rem", height: "100%", overflow: "auto"}}
                                      theme="monokai"
                                      collapsed={2}
                                      displayArrayKey={false}
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      enableClipboard={false}
                                      src={currentJournal}
        />}
      </div>
    </div>
  );
}

function DevtoolsOverview() {
  const [currentAsyncState, setCurrentAsyncState] = React.useState(EMPTY_ARRAY);
  const keys = useDevtoolsEntriesKeys();

  React.useEffect(() => {
    if (!keys) {
      setCurrentAsyncState(EMPTY_ARRAY);
    }
  }, [keys]);

  return (
    <div className="h-full">
      <h1>Devtools overview: state</h1>
      <div className="flex h-full">
        <div className="sidebar-container">
          <div className="sidebar">
            {(keys ?? []).map(({uniqueId, key, status}) =>
              <button key={uniqueId}
                      className={`sidebar-button ${uniqueId === currentAsyncState[0] ? 'sidebar-el-active' : ''}`}
                      role="button" onClick={() => setCurrentAsyncState([uniqueId, key])}>{key}-{status}
              </button>
            )}
          </div>
        </div>
        <div className="content-container">
          {currentAsyncState.length &&
          <AsyncStateOverview key={currentAsyncState[0]} identifier={currentAsyncState}/> || null}
        </div>
      </div>
    </div>
  );
}

function AsyncStateOverview({identifier: [id, key]}) {
  const data = useDevtoolsEntryState(id);
  return data && <ReactJson name={`${key}`}
                            style={{padding: "1rem", minHeight: "50vh", display: "flex", overflow: "auto"}}
                            theme="monokai"
                            collapsed={2}
                            src={data}
                            displayArrayKey={false}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}/> || null;
}
