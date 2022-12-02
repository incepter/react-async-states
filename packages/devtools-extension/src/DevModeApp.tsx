import * as React from "react";
import {createSource, useAsyncState,useSource, useSourceLane, useProducer, useSelector} from "react-async-states";
import type {State} from "react-async-states";

createSource<number>("test-1", null, {initialValue: 0})
createSource<number>("test-2", null, {initialValue: 0})


let meter = 0;
export default function DevModeApp() {
  const source = React.useMemo(() => createSource<number>("devmodeapp", null, {initialValue: 0}), []);
  const {state} = useSourceLane(source);
  return <button
    onClick={() => source.run(old => old.data + 1)}>{state.data}</button>
}
