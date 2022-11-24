import * as React from "react";
import ReactJson from "react-json-view";
import {useSource, useSourceLane,} from "react-async-states";
import {DevtoolsJournalEvent} from "react-async-states/dist/devtools";
import {currentJournal, journalSource} from "./sources";
import {addFormattedDate} from "./utils";

const CurrentJournalDisplay = React.memo(function Journal({lane}: { lane: string }) {

  return (
    <div className='main-bg'
         style={{
           display: 'flex',
           flexDirection: 'row',
           height: '100%',
           padding: 0
         }}>
      <div style={{
        width: 250,
        minWidth: 250,
        padding: 8,
        overflow: 'auto',
        borderRight: '1px dashed #C3C3C3',
      }} className='main-bg'>
        <div className=' scroll-y-auto' style={{height: '100%'}}>
          <div className="main-color main-bg">
            <JournalView lane={lane}/>
          </div>
        </div>
      </div>
      <div className='main-bg main-color scroll-y-auto'
           style={{
             height: '100%',
             overflowY: 'auto',
             width: '100%',
           }}>
        <CurrentJson/>
      </div>
    </div>);
});

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

  // handel select or unselect selectType
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value: DevtoolsJournalEvent = e.target.value as DevtoolsJournalEvent;
    if (selectedTypes.find((option: DevtoolsJournalEvent) => option === value) === undefined) {
      return setSelectedTypes([...selectedTypes, value])
    } else {
      return setSelectedTypes(selectedTypes.filter((option: DevtoolsJournalEvent) => option !== value))
    }
  }

  return (
    <div>
      <span>Available: ({allLogs.length}), shown: ({filteredData.length})</span>
      <div style={{display: "flex"}}>
        <button className="default-button"
                onClick={() => setSelectedTypes([])}
                style={{
                  backgroundColor: 'transparent',
                  border: "none",
                  color: '#00aaff',
                  cursor: "pointer"
                }}>Clear all
        </button>
        <button className="default-button"
                style={{
                  backgroundColor: 'transparent',
                  border: "none",
                  color: '#00aaff',
                  marginLeft: 8,
                  cursor: "pointer"
                }}
                onClick={() => setSelectedTypes(Object.values(DevtoolsJournalEvent))}
        >
          Select all
        </button>
      </div>
      <select
        multiple
        value={selectedTypes}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange(e)}
        style={{
          color: '#000',
          width: '100%',
          marginTop: 8,
          background: 'white',
          borderRadius: 5,
          outline: "none"
        }}>
        {Object.values(DevtoolsJournalEvent)?.map((t: string) => (
          <option key={t} value={t}>{t}</option>))}
      </select>
      <ul style={{marginTop: 8}}>
        {filteredData.map((entry) => (
          <li
            className="w-full"
            key={entry?.eventId}>
            <button
              style={{
                borderRadius: 100,
                backgroundColor: json.data?.eventId === entry.eventId ? '#0059ff' : 'transparent',
                color: json.data?.eventId === entry.eventId ? 'white' : '#00bbff',
                padding: '3px 10px',
                border: "none"
              }}
              className="default-button"
              onClick={() => {
                currentJournal.setState({
                  data: formJournalEventJson(entry),
                  eventId: entry.eventId,
                  uniqueId: entry.uniqueId,
                  name: `${entry.key} - ${entry.eventType}`,
                });
              }}>
              {`› ${entry.eventType}`}
            </button>
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
    <div style={{height: "100%"}} className="scroll-y-auto">
      <ReactJson name={json.data?.name}
                 theme="solarized"
                 style={{
                   padding: '1rem',
                   minHeight: 'calc(100% - 32px)'
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
