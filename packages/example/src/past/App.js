import React from "react";
import { useAsyncState } from "react-async-states";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BasicUsageDemo from "./BasicUsageDemo";
import RoutingDemo from "./RoutingDemo";
import SelectorsDemo from "./SelectorsDemo";
import ReducersDemo from "./ReducersDemo";
import StandaloneDemo from "./StandaloneDemo";
import DemoDemo from "./DemoDemo";
import EmitDemo from "./EmitDemo";
import ReduxDemo from "./ReduxDemo";
import BrokerDemo from "./BrokerDemo";
import NextDemo from "./NextDemo";
import ReplaceStateDemo from "./ReplaceStateDemo";
import Navigation from "./Navigation";
import DemoProvider from "./Provider";



function demoProducer(props) {
  props.run("posts");
  console.log('posts state', props.select("posts"));
  return null;
}

function ProducerRunPropsDemo() {
  const {state: {data}, run, abort} = useAsyncState.auto(demoProducer);
  const {mode, state: postsState} = useAsyncState.lazy("users");
  return (
    <div>
      <h1>run effects demo</h1>
      <h2>State value is: <pre>{JSON.stringify(data ?? [], null, 4)}</pre></h2>

      <h2>posts state value
        is {mode}: <pre>{JSON.stringify(postsState ?? {}, null, 4)}</pre>
      </h2>
      <button onClick={() => run(data)}>Run</button>
      <button
        onClick={() => abort()}>{status === "pending" ? "abort" : "stop"}</button>
    </div>
  );
}


function OutsideProvider() {

  return <ProducerRunPropsDemo />
}

function InsideProvider() {
  const {mode, state, run, replaceState} = useAsyncState({
    lazy: true,
    key: "counter",
    initialValue: 0,
    selector: s => s.data,
    hoistToProvider: true,
  });

  console.log('state is', mode, state)

  return (<>
    <button onClick={() => run(old => old.data - 1)}>Decrement: {state}</button>
    <button onClick={() => replaceState(old => old.data + 1)}>increment: {state}</button>
  </>);
}

function ShowCounter() {
  const {state} = useAsyncState({key: "counter", selector: s => s.data});

  return <span>counter is: {state}</span>
}

export default function App() {

  return (
    <Router>
      {/*<GeneratorsTests/>*/}
      {/*<OutsideProvider/>*/}
      <DemoProvider>
        <InsideProvider/>
        <div>
          <Navigation/>
          <hr/>
          <Routes>
            <Route exact path="/" element={<BasicUsageDemo/>}>
            </Route>
            <Route path="/users/:userId" element={<RoutingDemo/>}>
            </Route>
            <Route path="/reducers" element={<ReducersDemo/>}>
            </Route>
            <Route path="/broker" element={<BrokerDemo/>}>

            </Route>
            <Route path="/replace-state" element={<ReplaceStateDemo/>}>

            </Route>
            <Route path="/standalone" element={<StandaloneDemo/>}>

            </Route>
            <Route path="/selectors" element={<SelectorsDemo/>}>

            </Route>
            <Route path="/redux" element={<ReduxDemo/>}>

            </Route>
            <Route path="/next" element={<NextDemo/>}>

            </Route>
            <Route path="/demo" element={<DemoDemo/>}>

            </Route>
            <Route path="/emit" element={<EmitDemo/>}>

            </Route>
          </Routes>
        </div>
        <ShowCounter/>
      </DemoProvider>
    </Router>
  )
    ;
}

function GeneratorsTests() {
  return (
    <>
      <GeneratorSync/>
      <React.Suspense fallback="pending.............................................">
        <GeneratorAsync/>
      </React.Suspense>
    </>
  );
}

function* syncGenExample() {
  for (let i = 0; i < 10_0; i++) {
    yield i;
  }
  // throw 5;
  return yield 10_001;
}

function GeneratorSync() {
  const {state} = useAsyncState.auto(syncGenExample);
  // console.log('sync generator value', state);
  return null;
}

function* asyncGenExample(props) {
  for (let i = 0; i < 10; i++) {
    yield i;
  }
  let timeoutId;
  props.onAbort(function onAbort() {
    console.log('aborting timeout id', timeoutId);
    clearTimeout(timeoutId);
  });
  return yield new Promise(resolve => timeoutId = setTimeout(resolve, 10000));
  // try {
  //   throw new Error("testing");
  // } catch (e) {
  //   throw e;
  // }
}

function GeneratorAsync() {
  // React.useLayoutEffect(() => {
  //   console.log('async mounted layout effect');
  //   return () => console.log('unmounting layout effect!! async');
  // }, []);
  // React.useEffect(() => {
  //   console.log('async mounted');
  //   return () => console.log('unmounting!! async');
  // }, []);
  const {state, read} = useAsyncState.auto(asyncGenExample);
  // React.useEffect(() => {
  //   console.log('status change', state.status);
  // }, [state.status])
  // console.log('async generator value', read());
  return null;
}
