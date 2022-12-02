// sources
import * as React from "react";
import {
  Status,
  useSelector,
  useSource,
  useAsyncState,
  State
} from "react-async-states";
import {
  currentView,
  devtoolsInfo,
  gatewaySource, InstanceDetails, instanceDetails, InstancePlaceholder,
  InstancesList,
  instancesList
} from "../sources";
import Json from "./Json";

export default function DevtoolsView({
  useDevMode,
  onClose,
}: {
  useDevMode?: boolean;
  onClose?: Function;
}) {
  useAsyncState.auto({
    source: gatewaySource,
    payload: {dev: useDevMode ?? true}
  }, [useDevMode]);

  let {
    state: {status, data}
  } = useAsyncState.auto(devtoolsInfo);

  if (status === Status.pending || (status === Status.success && !data.connected)) {
    return "Trying to connect...";
  }

  if (status === Status.success) {
    return <ConnectedDevtools/>
  }

  if (status === Status.error) {
    console.error(data);
    return "It doesn't seem that you are using the library";
  }

  return null;
}

function ConnectedDevtools() {
  let {state} = useAsyncState(instancesList);


  if (state.status !== Status.success) {
    return null;
  }

  let instancesToDisplay = formatInstances(state.data);

  return (
    <div style={{display: "flex"}}>
      <ul>
        {
          Object.entries(instancesToDisplay)
            .map(([key, instances]) => <li key={key}>
              <InstanceGroupDetails display={key}
                                    instances={instances}/>
            </li>)
        }
      </ul>
      <div>
        <StateView/>
      </div>
    </div>
  );
}


const InstanceGroupDetails = React.memo(
  function InstanceGroupDetails(props: { instances: Record<string, InstancePlaceholder>, display: string }) {
    return Object.entries(props.instances)
      .map(([uniqueId, instance]) => (
        <InstanceDetailsView key={uniqueId} instance={instance}/>
      ));
  });

function selectSubscriptionsCount(state: State<InstanceDetails | null>) {
  if (!state || !state.data) {
    return Number.NaN;
  }
  return state.data.subscriptions!.length;
}

const InstanceDetailsView = React.memo(function InstanceDetailsView(props: { instance: InstancePlaceholder }) {
  let uniqueId = props.instance.uniqueId;

  let {state} = useAsyncState.auto({
    source: instanceDetails.getLaneSource(`${uniqueId}`),
    payload: {uniqueId: uniqueId},
  }, [uniqueId]);

  let subscriptionsCount = selectSubscriptionsCount(state);
  let subscriptionsFlags = state.data?.subscriptions?.map(t => t.devFlags.join(",")).join('|');

  return (
    <li>
      <span>
        <span>{props.instance.key}</span> -
        <span>{state.data?.state?.status}</span> -
        <span>{uniqueId}</span> -
        <span>({subscriptionsCount})</span>
        {subscriptionsFlags && <span>({subscriptionsFlags})</span>}
      </span>
      <button onClick={() => currentView.setState(`${uniqueId}`)}>View</button>
    </li>
  );
})


function sortLastUpdatedDesc([, aDetails], [, bDetails]) {
  if (!aDetails || !bDetails) {
    return 0;
  }

  if (aDetails.lastUpdate && bDetails.lastUpdate) {
    return bDetails.lastUpdate - aDetails.lastUpdate;
  }
  if (aDetails.lastUpdate && !bDetails.lastUpdate) {
    return -1;
  }
  if (!aDetails.lastUpdate && bDetails.lastUpdate) {
    return 1;
  }

  return 0;
}

function formatInstances(instances: InstancesList) {
  let entries = Object.entries(instances);

  let sorted = entries.sort(sortLastUpdatedDesc);

  let grouped = sorted.reduce((result, [uniqueId, details]) => {
    if (!result[details.key]) {
      result[details.key] = {};
    }
    result[details.key][uniqueId] = details;
    return result;
  }, {} as Record<string, Record<string, InstancePlaceholder>>);

  return grouped;
}

const StateView = React.memo(function StateView() {
  let {state: {data: currentId}} = useSource(currentView);
  if (!currentId) {
    return "Please select";
  }
  return <StateDetails key={currentId} id={currentId}/>
})

function StateDetails({id}) {
  let {
    state, version,
    source
  } = useSource(instanceDetails, id);

  console.log('current view', id, source, instanceDetails.getLaneSource(id))
  console.log('all lanes', instanceDetails.getAllLanes())
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
    <div style={{display: "flex"}}>
      <Json name={`${key} - State`} src={instance.state}/>
      <hr/>
      <Json name={`${key} - config`} level={4} src={{
        subscriptions: instance.subscriptions,
        config: instance.config,
        cache: instance.cache,
      }}/>
      <hr/>
      <Json level={1} name={`${key} - journal`} src={instance.journal}/>
    </div>
  );
}
