import React from "react";
import Layout from "antd/lib/layout";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
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
import { devtoolsJournalEvents } from "devtools/eventTypes";

const {Header, Content, Sider} = Layout;

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
    <Layout>
      <Header style={{
        padding: 0,
        height: 40,
        display: "flex",
        alignItems: "center",
      }} className="main-bg">
        <Actions lane={lane}/>
      </Header>
      <Layout style={{height: "calc(100vh - 56px)"}}>
        <Sider className="main-bg" width='30%'>
          <CurrentJsonDisplay lane={lane} mode="state"/>
        </Sider>
        <Content className="main-bg">
          <CurrentJsonDisplay lane={lane} mode="journal"/>
        </Content>
      </Layout>
    </Layout>
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
      size="small"
      shape="round"
      className="default-button w-full"
      type={isCurrent ? "primary" : "link"}
      onClick={() => {
        currentJournal.setState(null);
        currentState.setState(`${uniqueId}`);
      }}
    >
      <span style={{marginLeft: 8}}>{`› ${asyncStateKey}`}</span>
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
               style={{
                 padding: "1rem",
                 height: "calc(100vh - 56px)",
                 overflow: "auto"
               }}
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
    <Button
      type="link"
      size="small"
      shape="round"
      className="default-button"
      onClick={() => {
        gatewaySource
          .getState()
          .data
          ?.postMessage?.(DevtoolsMessagesBuilder.getAsyncState(lane));
      }}>Refresh</Button>
  );
}

const Actions = React.memo(function Actions({lane}) {

  return (
    <>
      <RefreshButton lane={lane}/>

      <EditState key={lane} lane={lane}/>

      <Button
        type="link"
        size="small"
        shape="round"
        style={{marginLeft: 8}}
        className="default-button"
        onClick={() => {
          currentJournal.setState(null);
          currentState.setState(null);
        }}> Close </Button>
    </>
  );
});

function EditState({lane}) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState("");
  const [isJson, setIsJson] = React.useState(true);
  const [status, setStatus] = React.useState(AsyncStateStatus.success);
  return (
    <>
      <Button
        type="link"
        style={{marginLeft: 8}}
        onClick={() => setOpen(true)} size="small" shape="round"
        className="default-button">Change state</Button>
      <Modal
        centered
        title="Change state"
        onCancel={() => setOpen(false)} onOk={() => {
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
        setOpen(false);
      }} visible={open}>
        {
          open && (
            <section className="w-full" style={{padding: '0px 8px'}}>
              <label style={{fontWeight: 600}}>Status:</label>
              <Select
                id="next-status"
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
                <section style={{
                  padding: '4px 0px',
                }}>
                  <h4>Data:</h4>
                  <span>
                    Type data and choose if it should be parsed as json.
                    <br/>
                  </span>
                  <textarea style={{width: '100%'}} rows={2} value={data}
                            onChange={e => setData(e.target.value)}></textarea>
                  <br/>
                  <input id="is-json" type="checkbox"
                         checked={isJson}
                         onChange={e => setIsJson(e.target.checked)}/>
                  <label style={{marginLeft: 16}} htmlFor="is-json">is JSON
                    data</label>
                  <br/>
                  <span>
                    You can choose preview states from here:
                    <br/>
                    <PreviewsStateChoice status={status} onChange={setData}
                                         lane={lane}/>
                  </span>
                </section>
              )}
              <details>
                <summary>
                  Preview:
                </summary>

                <ReactJson name="New state"
                           style={{
                             padding: "1rem",
                             height: "100%",
                             overflow: "auto"
                           }}
                           theme="monokai"
                           collapsed={2}
                           displayArrayKey={false}
                           displayDataTypes={false}
                           displayObjectSize={false}
                           enableClipboard={false}
                           src={{
                             status,
                             data: isJson ? formatData(data) : data,
                           }}
                />
              </details>
            </section>
          )
        }
      </Modal>

    </>
  );
}

function PreviewsStateChoiceDefault({lane, onChange}) {
  const {state} = useSourceLane(journalSource, lane);
  const updateEvents = (state.data?.journal ?? [])
    .filter(t => t.eventType === devtoolsJournalEvents.update)
    .reverse();
  return (
    <details>
      <summary>Choose from previous states</summary>

      <Select
        style={{width: '100%'}}
        options={updateEvents.map(t => ({
          label: `${t.eventPayload.newState.status} - ${stringifyForSelect(t.eventPayload.newState.data)}`,
          value: `${t.eventId}`,
          data: t,
        }))}
        onChange={(_v, option) => {
          onChange(stringifyForSelect(option.data.eventPayload.newState.data))
        }}
      />
    </details>
  );
}

function formatData(data) {
  try {
    return JSON.parse(data)
  } catch (e) {
    return data;
  }
}


const CurrentStateDisplay = React.memo(CurrentTreeDisplay);
const PreviewsStateChoice = React.memo(PreviewsStateChoiceDefault);

export default CurrentStateDisplay;

function stringifyForSelect(data) {
  if (typeof data === "string") {
    return data;
  }
  if (typeof data === "object" && data !== null) {
    return JSON.stringify(data);
  }
  return data;
}
