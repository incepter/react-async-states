import React from "react";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Tabs from "antd/lib/tabs";
import Select from "antd/lib/select";
import { useSource, useSourceLane, AsyncStateStatus } from "react-async-states";
import {
  currentJournal,
  currentState,
  gatewaySource,
  journalSource
} from "./sources";
import { DevtoolsMessagesBuilder } from "./utils";
import CurrentJournalDisplay from "./CurrentJournalDisplay";

function CurrentJsonDisplay({lane, mode}) {
  if (mode === "state") {
    return <StateView lane={lane}/>;
  }
  if (mode === "journal") {
    return <CurrentJournalDisplay lane={lane}/>;
  }
}

function CurrentTreeDisplay() {
  const {state} = useSource(currentState);
  const {data: lane} = state;
  if (!lane) {
    return null;
  }
  return (
    <div key={lane}>
      <Tabs type="card" defaultActiveKey="1">
        <Tabs.TabPane
          tab="Actions"
          key="3">
          <Actions lane={lane}/>
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <span
              style={{paddingLeft: 24, paddingRight: 24}}
            >
            State
          </span>
          }
          key="1">
          <CurrentJsonDisplay lane={lane} mode="state"/>
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <span
              style={{paddingLeft: 24, paddingRight: 24}}
            >
            Journal events
          </span>
          }
          key="2">
          <CurrentJsonDisplay lane={lane} mode="journal"/>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}

export const SideKey = React.memo(function SiderKey({
                                                      uniqueId,
                                                      asyncStateKey,
                                                      isCurrent
                                                    }) {
  React.useEffect(() => {
    gatewaySource
      .getState()
      .data
      ?.postMessage?.(DevtoolsMessagesBuilder.getAsyncState(uniqueId));
  }, [uniqueId]);
  return (
    <Button
      style={{
        height: 24,
        marginTop: 2,
        width: '100%',
        display: "flex",
        boarderRadius: 0,
        cursor: 'pointer',
        textAlign: 'start',
        alignItems: "center",
        borderBottom: 'none',
      }}
      type={isCurrent ? "primary" : "default"}
      onClick={() => {
        currentJournal.setState(null);
        currentState.setState(`${uniqueId}`);
      }}
    >
      {`› ${asyncStateKey}`}
    </Button>
  );
});


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
  const {
    key,
    lastSuccess,
    state: asyncStateState,
    subscriptions,
    producerType
  } = data;


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
                 producerType,
                 state: asyncStateState,
                 subscriptions,
                 lastSuccess,
               }}
    />
  );
}

function RefreshButton({lane}) {
  return (
    <Button onClick={() => {
      gatewaySource
        .getState()
        .data
        ?.postMessage?.(DevtoolsMessagesBuilder.getAsyncState(lane));
    }}>Refresh</Button>
  );
}

const Actions = React.memo(function Actions({lane}) {

  return (
    <div>
      <RefreshButton lane={lane}/>
      <Button onClick={() => {
        currentJournal.setState(null);
        currentState.setState(null);
      }}> Close </Button>
      <br/>
      <EditState lane={lane}/>
    </div>
  );
});

function EditState({lane}) {
  const [status, setStatus] = React.useState(AsyncStateStatus.success);
  const [data, setData] = React.useState("");
  const [isJson, setIsJson] = React.useState(true);
  return (
    <section>
      <summary>Change state</summary>
      <Select
        value={status}
        options={Object.values(AsyncStateStatus).map(t => ({
          label: t,
          value: t
        }))}
        onChange={v => {
          setStatus(v);
          if (v === AsyncStateStatus.pending) {
            setData(null);
          }
        }}
      />
      {status !== AsyncStateStatus.pending && (
        <section>
          <summary>Data</summary>
          <label htmlFor="is-json">JSON data</label>
          <input id="is-json" type="checkbox" checked={isJson}
                 onChange={e => setIsJson(e.target.checked)}/>
          <br/>
          <textarea value={data}
                    onChange={e => setData(e.target.value)}></textarea>
        </section>
      )}
      <Button onClick={() => {
        gatewaySource
          .getState()
          .data
          ?.postMessage?.(
          DevtoolsMessagesBuilder
            .changeAsyncState(
              lane,
              status,
              data,
              isJson
            )
        );
      }}>Change</Button>
    </section>
  );
}


const CurrentStateDisplay = React.memo(CurrentTreeDisplay);

export default CurrentStateDisplay;
