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
import { devtoolsJournalEvents, toDevtoolsEvents } from "devtools/eventTypes";
import { idsStateInitialValue, journalStateInitialValue } from "./dev-data";

const {Header, Content, Sider} = Layout;


let isDev = process.env.NODE_ENV !== "production";
let currentJournal = createSource("json", undefined);
let currentState = createSource("current-state", undefined);
let gatewaySource = createSource("gateway", gatewayProducer);
let logsSource = createSource("logs", logsProducer, {initialValue: isDev ? idsStateInitialValue : {}});
let journalSource = createSource("journal", journalProducer, {
  initialValue: {
    data: null,
    messages: [],
  }
});

if (isDev) {
  Object
    .keys(logsSource.getState().data ?? {})
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
    .keys(logsSource.getState().data ?? {})
    .forEach(id => journalSource.getLaneSource(`${id}`).setState({
      data: null,
      messages: []
    }));
  logsSource.setState({});
}

function gatewayProducer() {
  console.log('running gateway producer');
  const port = window.chrome.runtime.connect({name: "panel"});

  if (!isDev) {
    resetDevtools();
  }

  port.postMessage({
    type: "init",
    source: "async-states-devtools-panel",
    tabId: window.chrome.devtools.inspectedWindow.tabId
  });
  port.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    console.log('on message from agent listener!');
    switch (message.type) {
      case toDevtoolsEvents.journal:
        return logsSource.run("message", message);
      case toDevtoolsEvents.flush:
        resetDevtools();
        return;
      // case toDevtoolsEvents.provider:
      //   return syncProvider(message);
      case toDevtoolsEvents.asyncState:
        return logsSource.run("async-state", message);
      default:
        return;
    }
  });
  return port;
}

function logsProducer(props) {
  const lastData = props.lastSuccess.data ?? {};
  const [action, message] = props.args;

  if (!action || (action !== "message" && action !== "async-state") || !message) {
    return lastData;
  }

  const {key, uniqueId} = message.payload;
  console.log('processing message', uniqueId, action, message);
  journalSource.getLaneSource(`${uniqueId}`).run(action, message);

  if (lastData.hasOwnProperty(uniqueId)) {
    return lastData;
  }
  return {...lastData, [uniqueId]: key};

}

function journalProducer(props) {
  const lastData = props.lastSuccess.data ?? [];
  const [action, message] = props.args;

  if (!action || (action !== "message" && action !== "async-state") || !message) {
    return lastData;
  }

  let output = {...lastData};
  if (action === "message") {
    output.messages.push(message);
  }
  if (action === "async-state") {
    output.data = message;
  }

  return output;
}

export function DevtoolsV2() {
  useAsyncState.auto(gatewaySource);
  const {state: {data}} = useSource(logsSource);
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
  if (!lane) {
    return null;
  }
  return (
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
  );
}

const SideKey = React.memo(function SiderKey({uniqueId, asyncStateKey, isCurrent}) {
  return (
    <Button
      style={{width: '100%', color: isCurrent ? "red" : "unset"}}
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
  const {state} = useSourceLane(journalSource, lane);

  console.log('journal of lane', lane, state);

  const {data} = state;
  const {messages: allLogs, data: instanceInfo} = data;

  return (
    <Layout style={{height: '100vh'}}>
      <Header style={{height: 32}} className="header">
        {lane} - {instanceInfo?.payload.key ?? ''} journal
        - {allLogs.length} size
      </Header>
      <Layout>
        <Sider width={200} className="site-layout-background">
          <JournalView data={allLogs}/>
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

function JournalView({data}) {
  const [selectedTypes, setSelectedTypes] = React.useState(initialSelectedEvents);
  const filteredData = data.filter(t => selectedTypes.includes(t.payload.eventType));
  const {state: json} = useSource(currentJournal);
  return (
    <div>
      <span>Available: ({data.length}), shown: ({filteredData.length})</span>
      <br/>
      <Button onClick={() => setSelectedTypes([])}>Clear all</Button>
      <Button
        onClick={() => setSelectedTypes(Object.values(initialSelectedEvents))}
      >
        Select all
      </Button>
      <br/>
      <Select
        mode="multiple"
        style={{width: '100%'}}
        onChange={setSelectedTypes}
        defaultValue={selectedTypes}
        options={JOURNAL_EVENT_TYPES_FILTER_OPTIONS}
      />
      <ul style={{maxHeight: 400, overflowY: 'auto'}}>
        {filteredData.map((entry, id) => (
          <li
            style={{color: json.data?.eventId === entry.payload.eventId ? "red" : "black"}}
            key={id}>
            <Button onClick={() => {
              currentJournal.setState({
                data: formJournalEventJson(entry),
                eventId: entry.payload.eventId,
                uniqueId: entry.payload.uniqueId,
                name: `${entry.payload.key} - ${entry.payload.eventType}`,
              });
            }}>
              {entry.payload.eventType}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formJournalEventJson(entry) {
  switch (entry.payload.eventType) {
    case devtoolsJournalEvents.update: {
      const {oldState, newState, lastSuccess} = entry.payload.eventPayload;
      return {
        eventDate: new Date(entry.payload.eventDate),
        from: oldState.data,
        to: newState.data,
        oldState: oldState,
        newState: newState,
        lastSuccess: lastSuccess,
      };
    }
    case devtoolsJournalEvents.run:
    case devtoolsJournalEvents.dispose:
    case devtoolsJournalEvents.creation:
    case devtoolsJournalEvents.insideProvider: {
      return {
        ...entry.payload.eventPayload,
        eventDate: new Date(entry.payload.eventDate),
      };
    }
    case devtoolsJournalEvents.subscription:
    case devtoolsJournalEvents.unsubscription: {
      return {
        eventDate: new Date(entry.payload.eventDate),
        subscriptionKey: entry.payload.eventPayload,
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

function StateView({lane}) {


  const {state} = useSourceLane(journalSource, lane);

  console.log('showing state view for unique id', lane, state);

  const {data} = state;
  const {data: asyncStateInfo} = data;


  if (!asyncStateInfo) {
    return null;
  }
  return (
    <ReactJson name={asyncStateInfo?.key}
               style={{padding: "1rem", height: "100%", overflow: "auto"}}
               theme="monokai"
               collapsed={2}
               displayArrayKey={false}
               displayDataTypes={false}
               displayObjectSize={false}
               enableClipboard={false}
               src={asyncStateInfo?.payload}
    />
  );
}
