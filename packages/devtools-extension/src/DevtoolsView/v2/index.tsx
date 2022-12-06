// sources
import * as React from "react";
import {Status, useAsyncState} from "react-async-states";
import {devtoolsInfo, gatewaySource} from "../sources";
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

  let {state: {status, data}} = useAsyncState.auto(devtoolsInfo);

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

  return (
    <div className="devtools-root">
      <Sider/>
      <StateView/>
    </div>
  );
}
