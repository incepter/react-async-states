import React from "react";
import Select from "antd/lib/select";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Row from "antd/lib/row";
import Col from "antd/lib/col";
import {
  createSource,
  useAsyncState,
  useSource,
} from "react-async-states";
import { devtoolsJournalEvents, toDevtoolsEvents } from "devtools/eventTypes";
import { idsStateInitialValue, journalStateInitialValue } from "./dev-data";

let isDev = process.env.NODE_ENV !== "production";
let currentJson = createSource("json", undefined);
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
      console.log('replacing', id, journalStateInitialValue[`${id}`]);
      journalSource.getLaneSource(`${id}`).setState(
        journalStateInitialValue[`${id}`] ?? {
          data: null,
          messages: []
        }
      );
    });
}
//
// setTimeout(() => {
//   let logsSourceState = getState(logsSource);
//   console.log('logsSource - state', logsSourceState);
//
//   Object
//     .keys(logsSourceState.data ?? {})
//     .forEach(id =>
//       console.log('journalSource - lane - state', id, getState(getLaneSource(journalSource, `${id}`)))
//     );
// }, 10000);

function resetDevtools() {
  console.log('resetting devtools');
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
  const {state: logsState} = useSource(logsSource);

  const keys = Object.keys(logsState.data);

  console.log('==>', keys);

  return (<div>
    <button onClick={resetDevtools}>Reset</button>
    <button onClick={() => gatewaySource.run()}>Reconnect</button>
    <details open>
      <summary>here is the logs state</summary>
      <Row>
        <Col span={10}>
          <ul>
            {keys.map((key) => (<Journal key={key} lane={key}/>))}
          </ul>
        </Col>
        <Col span={13}>
          <CurrentJson/>
          <CurrentState/>
        </Col>
      </Row>
      <div>
      </div>
    </details>
  </div>);
}

const Journal = React.memo(function Journal({lane}) {
  const {state} = useAsyncState({
    lane, source: journalSource,
  });

  const {data} = state;
  const {messages: allLogs} = data;

  return (
    <details>
      <summary>{lane} - {allLogs?.[0]?.payload?.key ?? ''} journal
        - {allLogs.length} size
      </summary>
      <Button onClick={() => {
        currentJson.setState(null);
        currentState.setState(lane);
      }}>
        - current state
      </Button>
      <JournalView data={allLogs}/>
    </details>
  );
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
  const {state: json} = useSource(currentJson);
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
              currentJson.setState({
                data: formJournalEventJson(entry),
                eventId: entry.payload.eventId,
                uniqueId: entry.payload.uniqueId,
                name: `${entry.payload.key} - ${entry.payload.eventType}`,
              });
              currentState.setState(null);
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
  const {state: json} = useSource(currentJson);

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

function StateView({uniqueId}) {


  const {state} = useAsyncState({
    lane: uniqueId, source: journalSource,
  });

  console.log('showing state view for unique id', uniqueId, state);

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

function CurrentState() {
  const {state} = useSource(currentState);
  const {data: lane} = state;
  if (!lane) {
    return null;
  }
  return <StateView uniqueId={lane}/>
}
