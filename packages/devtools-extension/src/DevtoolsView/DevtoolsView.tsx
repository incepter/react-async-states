// sources
import * as React from "react";
import {Status, useAsyncState} from "react-async-states";
import {devtoolsInfo, gatewaySource} from "./sources";
import Sider from "./Sider";
import StateView from "./StateView";
import "./index.css";

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

  let {state} = useAsyncState.auto(devtoolsInfo);
  let {status, data} = state;

  if (status === "pending" || (status === "success" && !data.connected)) {
    return <span>Trying to connect...</span>;
  }

  if (status === "success") {
    return <ConnectedDevtools/>
  }

  if (status === "error") {
    console.error(data);
    return <span>It doesn't seem that you are using the library</span>
  }

  return null;
}

function ConnectedDevtools() {

  return (
    <div className="devtools-root">
      <Sider/>
      <StateView/>
    </div>
  );
}
