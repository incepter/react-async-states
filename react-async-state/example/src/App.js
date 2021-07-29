import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import BasicUsageDemo from "./BasicUsageDemo";
import RoutingDemo from "./RoutingDemo";
import SelectorsDemo from "./SelectorsDemo";
import ReducersDemo from "./ReducersDemo";
import StandaloneDemo from "./StandaloneDemo";
import ReplaceStateDemo from "./ReplaceStateDemo";
import Navigation from "./Navigation";
import DemoProvider from "./Provider";

export default function App() {

  return (
    <Router>
      <DemoProvider>
        <div>
          <Navigation/>
          <hr/>
          <Switch>
            <Route exact path="/">
              <BasicUsageDemo/>
            </Route>
            <Route path="/routing">
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
