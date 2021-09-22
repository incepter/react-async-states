import React from "react";
import ReactJson from "react-json-view";
import { dictionaryMock, journalMock } from "./mocks";

const isDev = process.env.NODE_ENV !== "production";

let dictionary = !isDev ? {} : dictionaryMock;

let journal = !isDev ? {} : journalMock;

if (isDev) {
  window.chrome = {
    devtools: {
      inspectedWindow: {
        tabId: -1,
      },
    },
    runtime: {
      connect() {
        return {
          postMessage(msg) {
            console.log('posting messages', msg);
          },
          onMessage: {
            addListener(fn) {
              console.log('listener', fn);
            }
          }
        };
      },
    }
  };
}

function applyMessageFromAgent(message) {
  if (!message) {
    return false;
  }
  switch (message.type) {
    case "sync-provider": {
      dictionary = {...dictionary, ...message.payload};
      return true;
    }
    case "async-state-information": {
      const {payload} = message;
      dictionary[payload.uniqueId] = payload;
      return true;
    }
    case "journal-event": {
      const {key, uniqueId, eventType, eventDate, eventPayload} = message.payload;
      if (!journal[uniqueId]) {
        journal[uniqueId] = [];
      }
      if (!dictionary[uniqueId]) {
        dictionary[uniqueId] = {
          key,
          uniqueId,
          state: {},
          lastSuccess: {},
          subscriptions: [],
          promiseType: undefined,
        };
      }
      const journalArray = journal[uniqueId];
      switch (eventType) {

        case "update":
        case "dispose": {
          dictionary[uniqueId].state = eventPayload.newState;
          dictionary[uniqueId].lastSuccess = eventPayload.lastSuccess;
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        case "promiseType": {
          dictionary[uniqueId].promiseType = eventPayload;
          return true;
        }
        case "run":
        case "creation": {
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        case "subscription": {
          dictionary[uniqueId].subscriptions.push(eventPayload);
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        case "unsubscription": {
          dictionary[uniqueId].subscriptions = dictionary[uniqueId]?.subscriptions?.filter(t => t !== eventPayload);
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        default: {
          return false;
        }
      }
    }
    default: {
      return false;
    }
  }
}

function App() {
  const rerender = React.useState()[1];
  const port = React.useRef();
  React.useEffect(() => {
    port.current = window.chrome.runtime.connect({
      name: "panel"
    });

    port.current.postMessage({
      type: "init",
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    });

    port.current.onMessage.addListener(message => {
      if (message.source !== "async-states-agent") {
        return;
      }
      console.log("*__message__from__agent*", message.type, message.payload, journal);
      const didApply = applyMessageFromAgent(message);
      if (didApply) {
        rerender({});
      }
    });

    port.current.postMessage({
      type: "get-provider-state",
      source: "async-states-devtools-panel"
    });
  }, []);

  console.log("========>", {journal: JSON.stringify(journal), dictionary: JSON.stringify(dictionary)});
  const entries = Object.entries(dictionary);

  return (
    <div>
      <header>
        {!entries.length && <p>
          Nothing to show
        </p>}
        <Layout port={port}/>
      </header>
    </div>
  );

}

const views = {
  overview: 0,
  journal: 1,
};

function Layout() {
  const [currentView, setCurrentView] = React.useState(views.overview);

  function onElementClick(nextValue) {
    return function caller() {
      setCurrentView(nextValue);
    }
  }

  return (
    <div className="main-container">
      <div className="sidebar-wrapper">
        <Sidebar onElementClick={onElementClick}/>
      </div>
      <div className="view-wrapper">
        {currentView === views.overview && <Overview/>}
        {currentView === views.journal && <Journal/>}
      </div>
    </div>
  );
}

function Sidebar({onElementClick}) {
  return (
    <div>
      <ul>
        <li onClick={onElementClick(views.overview)} className="sidebar-element">Overview</li>
        <li className="sidebar-element">Provider</li>
        <li onClick={onElementClick(views.journal)} className="sidebar-element">Journal</li>
      </ul>
    </div>
  );
}

function Journal() {
  const entries = Object.entries(journal);
  const [currentJson, setCurrentJson] = React.useState(null);
  const [currentJournal, setCurrentJournal] = React.useState(null);
  return (
    entries && (
      <div className="overview-container">
        <div className="overview-journal-list-container">
          {entries.map(([uniqueId, events]) => (
            <button className={`overview-key ${events === currentJournal ? 'active' : ''}`} key={uniqueId}
                    onClick={() => {
                      setCurrentJournal(events);
                      setCurrentJson(events?.length ? events[0] : null);
                    }}>{dictionary[uniqueId]?.key ?? "unknown__bug"}</button>
          ))}
        </div>
        <div className="overview-list-container">
          {currentJournal && currentJournal.map(value => (
            <button className={`overview-key ${value === currentJson ? 'active' : ''}`}
                    key={`${value.eventDate}-${value.uniqueId}-${value.eventType}`}
                    onClick={() => setCurrentJson(value)}>{value.eventType}</button>
          ))}
        </div>
        <div className="overview-journal-json-container">
          {currentJson && (
            <ReactJson name={`${currentJson.key}`}
                       style={{padding: "1rem", height: "calc(100% - 33px)", overflow: "auto"}}
                       theme="monokai"
                       collapsed={4}
                       src={currentJson}
                       displayArrayKey={false}
                       displayDataTypes={false}
                       displayObjectSize={false}
                       enableClipboard={false}/>
          )}
        </div>
      </div>
    )
  );
}


function Overview() {
  const entries = Object.values(dictionary);
  const [currentJson, setCurrentJson] = React.useState(null);
  return (
    entries && (
      <div className="overview-container">
        <div className="overview-list-container">
          {entries.map(value => (
            <button className="overview-key" key={value.uniqueId}
                    onClick={() => setCurrentJson(value)}>{value.key}</button>
          ))}
        </div>
        <div className="overview-json-container">
          {currentJson && (
            <ReactJson name={`${currentJson.key} - ${currentJson.state?.status}`}
                       style={{padding: "1rem", height: "calc(100% - 33px)", overflow: "auto"}}
                       theme="monokai"
                       collapsed={3}
                       src={currentJson}
                       displayArrayKey={false}
                       displayDataTypes={false}
                       displayObjectSize={false}
                       enableClipboard={false}/>
          )}
        </div>
      </div>
    )
  );
}


export default App;

