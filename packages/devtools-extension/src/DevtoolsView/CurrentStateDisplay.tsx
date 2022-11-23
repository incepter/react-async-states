import React from "react";
import Layout from "antd/es/layout";
import ReactJson from "react-json-view";
import Button from "antd/es/button";
import Modal from "antd/es/modal";
import Select from "antd/es/select";
import {useSource, useSourceLane, AsyncStateStatus} from "react-async-states";
import {DevtoolsJournalEvent} from "react-async-states/dist/devtools";
import {
  currentJournal,
  currentState,
  gatewaySource,
  journalSource
} from "./sources";
import {addFormattedDate, DevtoolsMessagesBuilder} from "./utils";
import CurrentJournalDisplay from "./CurrentJournalDisplay";
import {DevtoolsContext} from "./context";

const {Header, Content, Sider} = Layout;

function CurrentJsonDisplay({
  lane,
  mode
}: { lane: string, mode: 'state' | 'journal' }) {
  if (mode === "state") {
    return <StateView lane={lane}/>;
  }
  if (mode === "journal") {
    return <CurrentJournalDisplay key={lane} lane={lane}/>;
  }
  return null;
}

function CurrentTreeDisplay() {
  const {state} = useSource(currentState);
  const {data: lane} = state;
  if (!lane) {
    return null;
  }
  return (
    <Layout style={{height: '100%'}}>
      <Header style={{
        padding: 8,
        height: 40,
        display: "flex",
        alignItems: "center",
        borderBottom: '1px dashed #C3C3C3',
      }} className="main-bg">
        <Actions lane={lane}/>
      </Header>
      <Layout>
        <Sider style={{
          height: '100%',
          borderRight: '1px dashed #C3C3C3',
        }} className="main-bg" width={400}>
          <CurrentJsonDisplay lane={lane} mode="state"/>
        </Sider>
        <Content style={{
          maxHeight: '100%',
        }} className="main-bg">
          <CurrentJsonDisplay lane={lane} mode="journal"/>
        </Content>
      </Layout>
    </Layout>
  );
}

type SiderDisplayProps = {
  uniqueId: number,
  asyncStateKey: string,
  isCurrent: boolean,
  level?: number,
  lanes?: string
};

function getBackgroundColorFromStatus(status: AsyncStateStatus | undefined) {
  switch (status) {
    case AsyncStateStatus.error:
      return "#EB6774";
    case AsyncStateStatus.initial:
      return "#DEDEDE";
    case AsyncStateStatus.aborted:
      return "#787878";
    case AsyncStateStatus.pending:
      return "#5B95DB";
    case AsyncStateStatus.success:
      return "#17A449";
    default:
      return undefined;
  }
}

function getColorFromStatus(status: AsyncStateStatus | undefined) {
  switch (status) {
    case AsyncStateStatus.error:
      return "white";
    case AsyncStateStatus.initial:
      return "black";
    case AsyncStateStatus.aborted:
      return "white";
    case AsyncStateStatus.pending:
      return "white";
    case AsyncStateStatus.success:
      return "white";
    default:
      return undefined;
  }
}

export const SideKey = React.memo(function SiderKey({
  uniqueId,
  asyncStateKey,
  isCurrent,
  level = 0,
  lanes
}: SiderDisplayProps) {

  const {dev} = React.useContext(DevtoolsContext);

  React.useEffect(() => {
    gatewaySource
      .getState()
      .data
      ?.postMessage?.(DevtoolsMessagesBuilder.getAsyncState(uniqueId, dev));
  }, [uniqueId, dev]);

  const {state} = useSourceLane(journalSource, `${uniqueId}`);

  const {status} = state.data?.state ?? {};

  if (!lanes?.length) {
    return (
      <Button
        size="small"
        shape="round"
        className={`default-button`}
        style={{
          marginLeft: level * 30,
          width: level === 0 ? '100%' : `calc(100% - ${level * 30}px)`
        }}
        type={isCurrent ? "primary" : "link"}
        onClick={() => {
          currentJournal.setState(null);
          currentState.setState(`${uniqueId}`);
        }}
        loading={status === AsyncStateStatus.pending}
      >
        <div style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <span style={{marginLeft: 8}}
              title={`${asyncStateKey} (id: ${uniqueId})`}>{`› ${asyncStateKey}`}</span>
          {status !== undefined && (
            <div title={status} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: getBackgroundColorFromStatus(status),
            }}></div>
          )}
        </div>
      </Button>
    );
  }


  return (
    <>
      <Button
        size="small"
        shape="round"
        className={`default-button`}
        style={{
          marginLeft: level * 30,
          width: level === 0 ? '100%' : `calc(100% - ${level * 30}px)`
        }}
        type={isCurrent ? "primary" : "link"}
        onClick={() => {
          currentJournal.setState(null);
          currentState.setState(`${uniqueId}`);
        }}
        loading={status === AsyncStateStatus.pending}
      >
        <div style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <span style={{marginLeft: 8}}
              title={`${asyncStateKey} (id: ${uniqueId})`}>{`› ${asyncStateKey}`}</span>
          {status !== undefined && (
            <div title={status} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: getBackgroundColorFromStatus(status),
            }}></div>
          )}
        </div>
      </Button>
      <SiderLanes lanes={lanes} level={level + 1}/>
    </>
  );
});

function SiderLanes({lanes, level}) {
  const {state: {data: lane}} = useSource(currentState);
  return lanes.map(([id, key]) => <SideKey key={key} uniqueId={id}
                                           asyncStateKey={key}
                                           isCurrent={lane === id}
                                           level={level}
  />);
}


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

  if (!data.key) {
    return <span>No state information</span>;
  }
  return (
    <div style={{
      height: '100%'
    }} className="scroll-y-auto">
      <ReactJson name={`${data.key}'s state`}
                 style={{
                   padding: "1rem",
                   overflow: "auto"
                 }}
                 theme="solarized"
                 collapsed={5}
                 displayDataTypes={false}
                 displayObjectSize={false}
                 enableClipboard={false}
                 src={addFormattedDate(data.state)}
      />
      <hr />
      <ReactJson name={data.key}
                 style={{
                   padding: "1rem",
                   overflow: "auto"
                 }}
                 theme="solarized"
                 collapsed={1 }
                 displayDataTypes={false}
                 displayObjectSize={false}
                 enableClipboard={false}
                 src={displayAsyncState(data)}
      />
    </div>
  );
}

function displayAsyncState(data) {
  const output = {
    key: data.key,
    uniqueId: data.uniqueId,
    producerType: displayProducerType(data.producerType),
    state: addFormattedDate(data.state),
    subscriptions: data.subscriptions,
    lastSuccess: data.lastSuccess,

    lanes: data.lanes,
    cache: data.cache,
    parent: data.parent,
    config: data.config,
  };
  const {oldState} = data;
  if (oldState) { // @ts-ignore
    output.oldState = addFormattedDate(oldState);
  }
  return output;
}

function displayProducerType(value) {
  switch (value) {
    case 0:
      return 'indeterminate';
    case 1:
      return 'sync';
    case 2:
      return 'promise';
    case 3:
      return 'generator';
    case 4:
      return 'not provided';
  }
  return null;
}

function RefreshButton({lane}) {
  const {dev} = React.useContext(DevtoolsContext);
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
          ?.postMessage?.(DevtoolsMessagesBuilder.getAsyncState(lane, dev));
      }}>Refresh</Button>
  );
}

const Actions = React.memo(function Actions({lane}: { lane: string }) {

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
  const {dev} = React.useContext(DevtoolsContext);
  const [isJson, setIsJson] = React.useState(true);
  const [data, setData] = React.useState<string | null>("");
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
              isJson,
              dev
            )
        );
        setOpen(false);
      }} open={open}>
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
                  <textarea style={{width: '100%'}} rows={2} value={data ?? ''}
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
                           }}
                           theme="solarized"
                           collapsed={2}
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

function PreviewsStateChoiceDefault({
  lane,
  onChange
}: { lane: string, onChange: Function, status: any }) {
  const {state} = useSourceLane(journalSource, lane);
  const updateEvents = (state.data?.journal ?? [])
    .filter(t => t.eventType === DevtoolsJournalEvent.update)
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
          // @ts-ignore
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
