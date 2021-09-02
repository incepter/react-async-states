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
    initialValue: 0,
    selector: s => s.data,
  });

  console.log('state is', state)

  return (<>
    <button onClick={() => run(old => old.data + 1)}>run: {state}</button>
    <button onClick={() => replaceState(old => old.data + 1)}>replace: {state}</button>
  </>);
}

export default function App() {

  return (
    <Router>
      <OutsideProvider/>
      <DemoProvider>
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
      </DemoProvider>
    </Router>
  )
    ;
}
