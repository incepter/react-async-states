import React from "react";
import { useAsyncState } from "react-async-states";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import BasicUsageDemo from "./BasicUsageDemo";
import RoutingDemo from "./RoutingDemo";
import SelectorsDemo from "./SelectorsDemo";
import ReducersDemo from "./ReducersDemo";
import StandaloneDemo from "./StandaloneDemo";
import ReplaceStateDemo from "./ReplaceStateDemo";
import Navigation from "./Navigation";
import DemoProvider from "./Provider";

function OutsideProvider() {
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
      <DemoProvider>
        <OutsideProvider/>
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
          </Switch>
        </div>
        <ShowCounter/>
      </DemoProvider>
    </Router>
  )
    ;
}
