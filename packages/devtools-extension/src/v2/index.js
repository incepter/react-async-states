import React from "react";
import Select from "antd/lib/select";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Tabs from "antd/lib/tabs";
import Layout from "antd/lib/layout";
import {
  createSource,
  useAsyncState,
  useSource,
  useSourceLane,
} from "react-async-states";
import {
  devtoolsJournalEvents, newDevtoolsEvents,
  newDevtoolsRequests,
} from "devtools/eventTypes";
import { journalStateInitialValue } from "./dev-data";

const {Header, Content, Sider} = Layout;

let isDev = process.env.NODE_ENV !== "production";

// stores data related to any async state
let journalSource = createSource("journal", undefined);
// defines the gateway receiving messages from the app
let gatewaySource = createSource("gateway", gatewayProducer);
// stores the keys with unique ids of created states
let keysSource = createSource("keys", undefined, {initialValue: {}});

// contains the current state unique Id to display
let currentState = createSource("current-state", undefined);
let currentJournal = createSource("json", undefined);

if (isDev) {
  Object
    .keys(keysSource.getState().data ?? {})
    .forEach(id => {
      journalSource.getLaneSource(`${id}`).setState(
        journalStateInitialValue[`${id}`] ?? {
          data: null,
          messages: []
        }
      );
    });
}

function resetDevtools() {
  Object
    .keys(keysSource.getState().data ?? {})
    .forEach(id => journalSource.getLaneSource(`${id}`).setState({
      data: null,
      messages: []
    }));
  keysSource.setState({});
}

function gatewayProducer() {
  const port = window.chrome.runtime.connect({name: "panel"});

  port.postMessage({
    type: "init",
    source: "async-states-devtools-panel",
    tabId: window.chrome.devtools.inspectedWindow.tabId
  });
  port.postMessage({
    type: newDevtoolsRequests.getKeys,
    source: "async-states-devtools-panel",
    tabId: window.chrome.devtools.inspectedWindow.tabId
  });

  port.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    console.log('received message', message)
    switch (message.type) {
      case newDevtoolsEvents.setKeys: {
        return keysSource.setState(message.payload);
      }
      case newDevtoolsEvents.setAsyncState: {
        return journalSource.getLaneSource(`${message.uniqueId}`).setState(message.payload);
      }
      case newDevtoolsEvents.partialSync: {
        if (message.payload.eventType === devtoolsJournalEvents.run) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        if (message.payload.eventType === devtoolsJournalEvents.update) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                state: message.payload.eventPayload.newState,
                oldState: message.payload.eventPayload.oldState,
                lastSuccess: message.payload.eventPayload.lastSuccess,
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        if (message.payload.eventType === devtoolsJournalEvents.subscription) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                subscriptions: [...old.data.subscriptions, message.payload.eventPayload],
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        if (message.payload.eventType === devtoolsJournalEvents.unsubscription) {
          journalSource
            .getLaneSource(`${message.uniqueId}`)
            .setState(old => {
              return {
                ...old.data,
                subscriptions: old.data.subscriptions?.filter(t => t !== message.payload.eventPayload),
                journal: [...old.data.journal, message.payload],
              }
            })
        }
        return;
      }
      default:
        return;
    }
  });
  return port;
}

export function DevtoolsV2() {
  useAsyncState.auto(gatewaySource);
  const {state: {data}} = useSource(keysSource);
  const {state: {data: lane}} = useSource(currentState);

  const entries = Object.entries(data);

  return (
    <Layout style={{height: '100vh'}}>
      <Header style={{height: 32}} className="header">
        <div className="logo"/>
      </Header>
      <Layout>
        <Sider width={200} className="site-layout-background">
          <div style={{display: "flex", flexDirection: "column"}}>
            {entries.map(([uniqueId, key]) => <SideKey key={uniqueId}
                                                       uniqueId={uniqueId}
                                                       asyncStateKey={key}
                                                       isCurrent={uniqueId === lane}
            />)}
          </div>
        </Sider>
        <Layout>
          <Content
            className="site-layout-background"
          >
            <CurrentTreeDisplay/>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

function CurrentJsonDisplay({lane, mode}) {
  if (mode === "state") {
    return <StateView lane={lane}/>;
  }
  if (mode === "journal") {
    return <Journal lane={lane}/>;
  }
}

function CurrentTreeDisplay() {
  const {state} = useSource(currentState);
  const {data: lane} = state;
  console.log('current tree display', lane, state);
  if (!lane) {
    return null;
  }
  return (
    <div>
      <RefreshButton lane={lane} />
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane
          tab={<span style={{paddingLeft: 24, paddingRight: 24}}>State</span>}
          key="1">
          <CurrentJsonDisplay lane={lane} mode="state"/>
        </Tabs.TabPane>
        <Tabs.TabPane tab={<span style={{paddingLeft: 24, paddingRight: 24}}>Journal events</span>}
                      key="2">
          <CurrentJsonDisplay lane={lane} mode="journal"/>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}

const SideKey = React.memo(function SiderKey({
                                               uniqueId,
                                               asyncStateKey,
                                               isCurrent
                                             }) {
  React.useEffect(() => {
    gatewaySource.getState().data.postMessage({
      uniqueId,
      source: "async-states-devtools-panel",
      type: newDevtoolsRequests.getAsyncState,
      tabId: window.chrome.devtools.inspectedWindow.tabId
    });
  }, [uniqueId]);
  return (
    <Button
      style={{width: '100%'}}
      type={isCurrent ? "primary" : "default"}
      onClick={() => {
        currentJournal.setState(null);
        currentState.setState(`${uniqueId}`);
      }}
    >
      {asyncStateKey}
    </Button>
  );
});


const Journal = React.memo(function Journal({lane}) {

  return (
    <Layout style={{height: '100vh'}}>
      <Layout>
        <Sider width={200} className="site-layout-background">
          <JournalView lane={lane}/>
        </Sider>
        <Layout>
          <Content
            className="site-layout-background"
          >
            <CurrentJson/>
          </Content>
        </Layout>
      </Layout>
    </Layout>);
});

const JOURNAL_EVENT_TYPES_FILTER_OPTIONS = Object.values(devtoolsJournalEvents).map(t => ({
  label: t, value: t
}));
const initialSelectedEvents = [
  devtoolsJournalEvents.creation,
  devtoolsJournalEvents.run,
  devtoolsJournalEvents.update,
];

function sortByEventIdDesc(ev1, ev2) {
  return ev2.eventId - ev1.eventId;
}

function JournalView({lane}) {
  const {state: json} = useSource(currentJournal);
  const {state: {data}} = useSourceLane(journalSource, lane);

  const {journal: allLogs} = data ?? {};
  const [selectedTypes, setSelectedTypes] = React.useState(initialSelectedEvents);
  const filteredData = React.useMemo(() => {
    return allLogs
      .filter(t => selectedTypes.includes(t.eventType))
      .sort(sortByEventIdDesc)
  }, [data, selectedTypes]);

  return (
    <div>
      <span>Available: ({allLogs.length}), shown: ({filteredData.length})</span>
      <br/>
      <Button onClick={() => setSelectedTypes([])}>Clear all</Button>
      <Button
        onClick={() => setSelectedTypes(Object.values(devtoolsJournalEvents))}
      >
        Select all
      </Button>
      <br/>
      <Select
        mode="multiple"
        value={selectedTypes}
        style={{width: '100%'}}
        onChange={setSelectedTypes}
        defaultValue={selectedTypes}
        options={JOURNAL_EVENT_TYPES_FILTER_OPTIONS}
      />
      <ul style={{maxHeight: 'calc(100vh - 300px)', overflowY: 'auto'}}>
        {filteredData.map((entry, id) => (
          <li
            style={{color: json.data?.eventId === entry.eventId ? "red" : "black"}}
            key={id}>
            <Button onClick={() => {
              currentJournal.setState({
                data: formJournalEventJson(entry),
                eventId: entry.eventId,
                uniqueId: entry.uniqueId,
                name: `${entry.key} - ${entry.eventType}`,
              });
            }}>
              {entry.eventType}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formJournalEventJson(entry) {
  console.log('forming entry', entry);
  switch (entry.eventType) {
    case devtoolsJournalEvents.update: {
      const {oldState, newState, lastSuccess} = entry.eventPayload;
      return {
        eventDate: new Date(entry.eventDate),
        from: oldState.data,
        to: newState.data,
        oldState: oldState,
        newState: newState,
        lastSuccess: lastSuccess,
      };
    }
    case devtoolsJournalEvents.run:
    case devtoolsJournalEvents.dispose:
    case devtoolsJournalEvents.insideProvider: {
      return {
        ...entry,
        eventDate: new Date(entry.eventDate),
      };
    }
    case devtoolsJournalEvents.subscription:
    case devtoolsJournalEvents.unsubscription: {
      return {
        eventDate: new Date(entry.eventDate),
        subscriptionKey: entry,
      };
    }
    default:
      return null;
  }
}

function CurrentJson() {
  const {state: json} = useSource(currentJournal);

  if (!json.data) {
    return null;
  }
  return (
    <ReactJson name={json.data?.name}
               style={{padding: "1rem", height: "100%", overflow: "auto"}}
               theme="monokai"
               collapsed={2}
               displayArrayKey={false}
               displayDataTypes={false}
               displayObjectSize={false}
               enableClipboard={false}
               src={json.data?.data}
    />
  );
}

function RefreshButton({lane}) {
  return (
    <Button onClick={() => {
      gatewaySource.getState().data.postMessage({
        uniqueId: lane,
        source: "async-states-devtools-panel",
        type: newDevtoolsRequests.getAsyncState,
        tabId: window.chrome.devtools.inspectedWindow.tabId
      });
    }}>Click to refresh</Button>
  );
}

function StateView({lane}) {
  const {state} = useSourceLane(journalSource, lane);
  console.log('showing state view for unique id', lane, state);
  if (!state.data) {
    return (
      <div>
        <span>No state information</span>
        <RefreshButton lane={lane}/>
      </div>
    );
  }

  const {data} = state;
  const {key, lastSuccess, state: asyncStateState, subscriptions} = data;


  if (!key) {
    return <span>No state information</span>;
  }
  return (
    <ReactJson name={key}
               style={{padding: "1rem", height: "100%", overflow: "auto"}}
               theme="monokai"
               collapsed={2}
               displayArrayKey={false}
               displayDataTypes={false}
               displayObjectSize={false}
               enableClipboard={false}
               src={{
                 key,
                 state: asyncStateState,
                 subscriptions,
                 lastSuccess,
               }}
    />
  );
}
