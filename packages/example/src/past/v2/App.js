import React from "react";
import { BrowserRouter as Router, Link, Route, Switch } from "react-router-dom";
import DemoProvider from "./core/AsyncStateProvider";
import UsersPage, { UserDetailsPage } from "./domain/users";

export default function App() {
  return (
    <Router>
      <DemoProvider>
        <div>
          <ul style={{display: "flex", justifyContent: 'space-around'}}>
            <li>
              <Link to="/users">Users list</Link>
            </li>
            <li>
              <Link to="/users/:userId">User details</Link>
            </li>
          </ul>
          <hr/>
          <Switch>
            <Route exact path="/users">
              <UsersPage/>
            </Route>
            <Route path="/users/:userId">
              <UserDetailsPage/>
            </Route>
          </Switch>
        </div>
      </DemoProvider>
    </Router>
  );
}
