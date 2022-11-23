import * as React from "react";
import Select from "antd/es/select";
import ReactJson from "react-json-view";
import Button from "antd/es/button";
import Layout from "antd/es/layout";
import {useSource, useSourceLane,} from "react-async-states";
import {DevtoolsJournalEvent} from "react-async-states/dist/devtools";
import {currentJournal, journalSource} from "./sources";
import {addFormattedDate} from "./utils";

const {Content, Sider} = Layout;

const CurrentJournalDisplay = React.memo(function Journal({lane}: { lane: string }) {

  return (
    <Layout className='main-bg' style={{
      height: '100%',
      padding: 0
    }}>
      <Sider style={{
        padding: 8,
        overflow: 'auto',
        // height: 'calc(100vh - 40px)',
        borderRight: '1px dashed #C3C3C3',
      }} className='main-bg scroll-y-auto' width={250}>
        <div className='main-color' style={{height: '100%'}}>
          <JournalView lane={lane}/>
        </div>
      </Sider>
      <Content className='main-bg main-color scroll-y-auto'
               style={{height: '100%', overflowY: 'auto'}}>
        <CurrentJson/>
      </Content>
    </Layout>);
});

const JOURNAL_EVENT_TYPES_FILTER_OPTIONS = Object.values(DevtoolsJournalEvent).map(t => ({
  label: t, value: t
}));
const initialSelectedEvents = [
  DevtoolsJournalEvent.creation,
  DevtoolsJournalEvent.update,
];

function sortByEventIdDesc(ev1, ev2) {
  return ev2.eventId - ev1.eventId;
}

function JournalView({lane}) {
  const {state: json} = useSource(currentJournal);
  const {state: {data}} = useSourceLane(journalSource, lane);

  const {journal: allLogs = []} = data ?? {};
  const [selectedTypes, setSelectedTypes] = React.useState(initialSelectedEvents);
  const filteredData = React.useMemo(() => {
    return allLogs
      ?.filter(t => selectedTypes.includes(t.eventType))
      .sort(sortByEventIdDesc) ?? []
  }, [data, selectedTypes]);

  React.useEffect(() => {
    if (!currentJournal.getState().data && filteredData[0]) {
      const entry = filteredData[0];
      currentJournal.setState({
        data: formJournalEventJson(entry),
        eventId: entry.eventId,
        uniqueId: entry.uniqueId,
        name: `${entry.key} - ${entry.eventType}`,
      });
    }
  }, [lane]);

  return (
    <div>
      <span>Available: ({allLogs.length}), shown: ({filteredData.length})</span>
      <div style={{display: "flex"}}>
        <Button type="link" size="small" shape="round"
                className="default-button"
                onClick={() => setSelectedTypes([])}>Clear all</Button>
        <Button type="link" size="small" shape="round"
                className="default-button"
                style={{marginLeft: 8}}
                onClick={() => setSelectedTypes(Object.values(DevtoolsJournalEvent))}
        >
          Select all
        </Button>
      </div>
      <Select
        mode="multiple"
        value={selectedTypes}
        style={{width: '100%', marginTop: 8}}
        onChange={setSelectedTypes}
        defaultValue={selectedTypes}
        options={JOURNAL_EVENT_TYPES_FILTER_OPTIONS}
      />
      <ul style={{marginTop: 8}}>
        {filteredData.map((entry, id) => (
          <li
            className="w-full"
            key={id}>
            <Button
              type={json.data?.eventId === entry.eventId ? "primary" : "link"}
              size="small" shape="round" className="default-button"
              onClick={() => {
                currentJournal.setState({
                  data: formJournalEventJson(entry),
                  eventId: entry.eventId,
                  uniqueId: entry.uniqueId,
                  name: `${entry.key} - ${entry.eventType}`,
                });
              }}>
              {`› ${entry.eventType}`}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formJournalEventJson(entry) {
  switch (entry.eventType) {
    case DevtoolsJournalEvent.update: {
      const {oldState, newState, lastSuccess} = entry.eventPayload;
      return {
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
        from: oldState.data,
        to: newState.data,
        oldState: addFormattedDate(oldState),
        newState: addFormattedDate(newState),
        lastSuccess: lastSuccess,
      };
    }
    case DevtoolsJournalEvent.run:
    case DevtoolsJournalEvent.dispose:
    case DevtoolsJournalEvent.creation:
    case DevtoolsJournalEvent.insideProvider: {
      return {
        eventId: entry.eventId,
        eventType: entry.eventType,
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
        payload: entry.eventPayload,
      };
    }
    case DevtoolsJournalEvent.subscription:
    case DevtoolsJournalEvent.unsubscription: {
      return {
        subscriptionKey: entry,
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
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
    <div>
      <ReactJson name={json.data?.name}
                 theme="solarized"
                 style={{
                   padding: '1rem'
                 }}
                 collapsed={2}
                 displayDataTypes={false}
                 displayObjectSize={false}
                 enableClipboard={false}
                 src={json.data?.data}
      />

    </div>

  );
}

export default CurrentJournalDisplay;
