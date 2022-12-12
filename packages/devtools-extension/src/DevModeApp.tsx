import * as React from "react";
import {
  createSource,
  useAsyncState,
  useSource,
  useSourceLane,
  useProducer,
  useSelector
} from "react-async-states";

createSource<number>("test-2", null, {initialValue: 0})
createSource<number>("test-1", null, {initialValue: 0})
  .getLaneSource("test-1-lane")
  .getLaneSource("test-1-lane-lane-nested");


function DevModeApp({alias}) {
  const source = React.useMemo(() => createSource<number>(alias, null, {initialValue: 0}), []);
  const {state} = useSourceLane(source, `${alias}-lane`);
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
      <hr />
      <DevModeApp alias="random"/>
      <hr />
      <Interval alias="interval-demo" delay={3000} />
    </>
  );
}
