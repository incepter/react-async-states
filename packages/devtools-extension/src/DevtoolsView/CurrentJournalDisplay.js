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
    <Layout className='main-bg' style={{
      height: '100%',
      padding: 0
    }}>
      <Sider style={{
        padding: 8,
        borderRight: '1px dashed #C3C3C3',
      }} className='main-bg main-color' width={250}>
        <JournalView lane={lane}/>
      </Sider>
      <Content className='main-bg main-color'
               style={{height: '100%', overflowY: 'auto'}}>
        <CurrentJson/>
      </Content>
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
                onClick={() => setSelectedTypes(Object.values(devtoolsJournalEvents))}
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
    <div>
      <ReactJson name={json.data?.name}
                 theme="solarized"
                 style={{
                   padding: '1rem'
                 }}
                 collapsed={2}
                 displayArrayKey={false}
                 displayDataTypes={false}
                 displayObjectSize={false}
                 enableClipboard={false}
                 src={json.data?.data}
      />

    </div>

  );
}

export default CurrentJournalDisplay;
