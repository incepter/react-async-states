import * as React from "react";
import {
  createSource,
  useAsyncState,
  useSource,
  useSourceLane,
  useProducer,Status,
  useSelector
} from "react-async-states";

createSource<number>("test-2", null, {initialValue: 0})
createSource<number>("test-1", null, {initialValue: 0})
  .getLaneSource("test-1-lane")
  .getLaneSource("test-1-lane-lane-nested");

let meter = 0;

let source = createSource<number>("devmodeapp", null, {initialValue: 0})

function DevModeApp({alias}) {
  const {state} = useAsyncState({
    source,
    lazy: false,
    autoRunArgs: [++meter],
    condition: (actualState) => actualState.status === Status.initial
  });
  return <button
    onClick={() => source.run(old => old.data + 1)}>{alias} - {state.data}</button>
}

function intevalProducer(props) {
  let id = setInterval(() => {
    props.emit(old => old.data + 1);
  }, props.payload.delay);
  props.onAbort(() => clearInterval(id));

  return props.lastSuccess.data;
}

function Interval({alias, delay}) {
  const source = React.useMemo(() => createSource<number>(alias, intevalProducer, {initialValue: 0}), []);
  const {state} = useAsyncState.auto({source, payload: {delay}}, [delay]);
  return <button
    onClick={() => source.run(old => old.data + 1)}>Interval {alias} - {state.data}</button>
}

export default function DevModeAppExp() {
  return (
    <>
      <DevModeApp alias="devmodeapp"/>
      <hr/>
      <DevModeApp alias="random"/>
      <hr/>
      <Interval alias="interval-demo" delay={3000}/>
    </>
  );
}
