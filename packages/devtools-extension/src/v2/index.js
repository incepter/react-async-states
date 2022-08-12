import {
  createSource,
  runSource,
  runSourceLane,
  useAsyncState,
  useSource,
  runpSource,
  getState,
  replaceLaneState,
  replaceState
} from "react-async-states";
import { toDevtoolsEvents } from "devtools/eventTypes";

const logsSource = createSource("logs", logsProducer, {initialValue: {}});
const statesSource = createSource("states", statesProducer);
const gatewaySource = createSource("gateway", gatewayProducer);
const journalSource = createSource("journal", journalProducer, {initialValue: []});

runpSource(gatewaySource).then(
  s => console.log('successfully ran the gateway source', s)
);

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
    console.log('________interesting___________', message)
    switch (message.type) {
      case toDevtoolsEvents.journal:
        return runSource(logsSource, message);
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
  const {state: logsState} = useSource(logsSource);

  const keys = Object.keys(logsState.data);

  return (
    <div>
      <details open>
        <summary>here is the logs state</summary>
        <ul>
          {keys.map((key) => (
            <Journal key={key} lane={key}/>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Journal({lane}) {
  const {state} = useAsyncState({
    lane,
    source: journalSource,
  });

  const {data: allLogs} = state;

  console.log('==> all logs <==', state, allLogs)
  return (
    <details>
      <summary>{lane} - {allLogs?.[0]?.payload?.key ?? ''} journal
        - {allLogs.length} size
      </summary>
      <ul>
        {allLogs.map((entry, id) => (
          <li key={id}>
            <details>
              <summary>{entry.payload.eventType}</summary>
              <pre>{JSON.stringify(entry.payload, null, 4)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </details>
  );
}
