import React from "react";
import Select from "antd/lib/select";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Row from "antd/lib/row";
import Col from "antd/lib/col";
import {
  createSource,
  runSource,
  runSourceLane,
  useAsyncState,
  useSource,
  getState,
  replaceLaneState,
  replaceState,
} from "react-async-states";
import { devtoolsJournalEvents, toDevtoolsEvents } from "devtools/eventTypes";

let currentJson = createSource("json", undefined);
let statesSource = createSource("states", statesProducer);
let gatewaySource = createSource("gateway", gatewayProducer);
let logsSource = createSource("logs", logsProducer, {initialValue: {}});
let journalSource = createSource("journal", journalProducer, {initialValue: []});

function resetDevtools() {
  const oldJournalUniqueIds = getState(logsSource);
  const oldUniqueIds = Object.keys(oldJournalUniqueIds ?? {});
  oldUniqueIds.forEach(id => replaceLaneState(journalSource, `${id}`, []));
  replaceState(logsSource, {});
}

function gatewayProducer() {
  const port = window.chrome.runtime.connect({name: "panel"});

  resetDevtools();

  port.postMessage({
    type: "init",
    source: "async-states-devtools-panel",
    tabId: window.chrome.devtools.inspectedWindow.tabId
  });
  port.onMessage.addListener(message => {
    if (message.source !== "async-states-agent") {
      return;
    }
    switch (message.type) {
      case toDevtoolsEvents.journal:
        return runSource(logsSource, message);
      case toDevtoolsEvents.flush:
        resetDevtools();
        return;
      // case toDevtoolsEvents.provider:
      //   return syncProvider(message);
      case toDevtoolsEvents.asyncState:
        return runSource(statesSource, message);
      default:
        return;
    }
  });
  return port;
}

function logsProducer(props) {
  const lastData = props.lastSuccess.data ?? {};
  const message = props.args[0];

  if (!message) {
    return lastData;
  }

  const {key, uniqueId} = message.payload;
  runSourceLane(journalSource, `${uniqueId}`, message);

  if (lastData.hasOwnProperty(uniqueId)) {
    return lastData;
  }
  return {...lastData, [uniqueId]: key};
}

function journalProducer(props) {
  const lastData = props.lastSuccess.data ?? [];
  const message = props.args[0];

  if (!message) {
    return lastData;
  }

  return [...lastData, message];
}


function statesProducer() {
  return null;
}


export function DevtoolsV2() {
  useAsyncState.auto(gatewaySource);
  const {state: logsState} = useSource(logsSource);

  const keys = Object.keys(logsState.data);

  return (<div>
    <button onClick={resetDevtools}>Reset</button>
    <button onClick={() => runSource(gatewaySource)}>Reconnect</button>
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

  const {data: allLogs} = state;

  return (
    <details>
      <summary>{lane} - {allLogs?.[0]?.payload?.key ?? ''} journal
        - {allLogs.length} size
      </summary>
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
      <Select
        mode="multiple"
        style={{width: '100%'}}
        onChange={setSelectedTypes}
        defaultValue={selectedTypes}
        options={JOURNAL_EVENT_TYPES_FILTER_OPTIONS}
      />
      <ul style={{ maxHeight: 400, overflowY: 'auto'}}>
        {filteredData.map((entry, id) => (
          <li
            style={{color: json.data?.eventId === entry.payload.eventId ? "red" : "black"}}
            key={id}>
            <Button onClick={() => {
              replaceState(currentJson, {
                data: formJournalEventJson(entry),
                eventId: entry.payload.eventId,
                name: `${entry.payload.key} - ${entry.payload.eventType}`,
              })
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
