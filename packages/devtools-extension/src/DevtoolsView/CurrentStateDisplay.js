import React from "react";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Tabs from "antd/lib/tabs";
import { useSource, useSourceLane, } from "react-async-states";
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
    <div>
      <RefreshButton lane={lane}/>
      <Tabs defaultActiveKey="1">
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
    }}>Click to refresh</Button>
  );
}


const CurrentStateDisplay = React.memo(CurrentTreeDisplay);

export default CurrentStateDisplay;
