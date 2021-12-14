import React from "react";
import { useAsyncState } from "react-async-states";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import BasicUsageDemo from "./BasicUsageDemo";
import RoutingDemo from "./RoutingDemo";
import SelectorsDemo from "./SelectorsDemo";
import ReducersDemo from "./ReducersDemo";
import StandaloneDemo from "./StandaloneDemo";
import DemoDemo from "./DemoDemo";
import ReduxDemo from "./ReduxDemo";
import NextDemo from "./NextDemo";
import ReplaceStateDemo from "./ReplaceStateDemo";
import Navigation from "./Navigation";
import DemoProvider from "./Provider";
import { DOMAIN_USER_PRODUCERS } from "./v2/domain/users/producers";

function OutsideProvider() {
  const data = useAsyncState({
    lazy: true,
    condition: false,
    source: DOMAIN_USER_PRODUCERS.details,
  });

  window.__AM_LAZY__ = data.source;

  return <button onClick={() => {
    data.mergePayload({userId: (data.payload.userId || 0) + 1});
    data.run();
  }}>RUUUUUUUN{JSON.stringify(data.state.status)}-{JSON.stringify(data.lastSuccess.data?.id)}</button>;
}

function InsideProvider() {
  const {state, run, replaceState} = useAsyncState({
    lazy: true,
    key: "counter",
    initialValue: 0,
    selector: s => s.data,
    hoistToProvider: true,
  });

  console.log('state is', state)

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
      <GeneratorsTests/>
      <OutsideProvider/>
      <DemoProvider>
        <InsideProvider/>
        <div>
          <Navigation/>
          <hr/>
          <Switch>
            <Route exact path="/">
              <BasicUsageDemo/>
            </Route>
            <Route path="/users/:userId">
              <RoutingDemo/>
            </Route>
            <Route path="/reducers">
              <ReducersDemo/>
            </Route>
            <Route path="/replace-state">
              <ReplaceStateDemo/>
            </Route>
            <Route path="/standalone">
              <StandaloneDemo/>
            </Route>
            <Route path="/selectors">
              <SelectorsDemo/>
            </Route>
            <Route path="/redux">
              <ReduxDemo/>
            </Route>
            <Route path="/next">
              <NextDemo/>
            </Route>
            <Route path="/demo">
              <DemoDemo/>
            </Route>
          </Switch>
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
