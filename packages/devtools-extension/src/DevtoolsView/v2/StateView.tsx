import React from "react";
import {currentView, instanceDetails} from "../sources";
import Json from "./Json";
import {useSource} from "react-async-states";

export default function StateView() {
  let {state: {data: currentId}} = useSource(currentView);
  if (!currentId) {
    return <span>Please select</span>;
  }
  return <StateDetails id={currentId}/>
}
const emptyObject = {}

function StateDetails({id}) {
  let [displayedTabs, setDisplayedTabs] = React.useState<Record<string, boolean>>(emptyObject);
  let {
    state, version,
    source
  } = useSource(instanceDetails, id);

  if (!id || !state.data) {
    console.log(state)
    return (
      <div>
        <span>State not synced yet!</span>
      </div>
    );
  }

  let instance = state.data;
  let key = instance!.key;

  return (
    <div className="state-view-root">
      <div className="state-view-header">
        <button onClick={() => setDisplayedTabs(old => ({
          ...old,
          config: !old.config
        }))}>{displayedTabs.config ? 'Hide' : 'Show'} config
        </button>
        <button onClick={() => setDisplayedTabs(old => ({
          ...old,
          journal: !old.journal
        }))}>{displayedTabs.journal ? 'Hide' : 'Show'} journal
        </button>
      </div>
      <div className="state-view-container">
        <div className="state-view-section">
          <Json name={`${key} - State`} src={instance.state}/>
        </div>
        {displayedTabs.config && (
          <div className="state-view-section">
            <Json name={`${key} - config`} level={4} src={{
              subscriptions: instance.subscriptions,
              config: instance.config,
              cache: instance.cache,
            }}/>
          </div>
        )}
        {displayedTabs.journal && (
          <div className="state-view-section">
            <Json level={4} name={`${key} - journal`} src={instance.journal}/>
          </div>
        )}
      </div>

    </div>
  );
}
