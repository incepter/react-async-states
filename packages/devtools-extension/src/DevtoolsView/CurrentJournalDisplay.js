import React from "react";
import { devtoolsJournalEvents } from "devtools/eventTypes";
import Select from "antd/lib/select";
import ReactJson from "react-json-view";
import Button from "antd/lib/button";
import Layout from "antd/lib/layout";
import { useSource, useSourceLane, } from "react-async-states";
import { currentJournal, journalSource } from "./sources";

const {Content, Sider} = Layout;

const CurrentJournalDisplay = React.memo(function Journal({lane}) {

  return (
    <Layout className='main-bg' style={{height: 'calc(100vh - 200px)'}}>
      <Layout>
        <Sider width={400}>
          <JournalView lane={lane}/>
        </Sider>
        <Layout>
          <Content>
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

function addFormattedDate(obj, prop = "timestamp", newProp = "formattedTimestamp") {
  return {...obj, [newProp]: new Date(obj[prop]).toISOString()};
}

function formJournalEventJson(entry) {
  switch (entry.eventType) {
    case devtoolsJournalEvents.update: {
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
    case devtoolsJournalEvents.run:
    case devtoolsJournalEvents.dispose:
    case devtoolsJournalEvents.creation:
    case devtoolsJournalEvents.insideProvider: {
      return {
        eventId: entry.eventId,
        eventType: entry.eventType,
        eventDate: entry.eventDate,
        formattedEventDate: new Date(entry.eventDate).toISOString(),
        payload: entry.eventPayload,
      };
    }
    case devtoolsJournalEvents.subscription:
    case devtoolsJournalEvents.unsubscription: {
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

export default CurrentJournalDisplay;
