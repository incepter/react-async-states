import React from "react";
import { Link } from "react-router-dom";
import { useAsyncState, useAsyncStateSelector } from "react-async-states";

function Resume() {
  const {state} = useAsyncState({
    key: "login-form",
    selector: state => {
      return Object.entries(state.data ?? {}).map(([key, value]) => `${key}=${value}`).join('&');
    }
  })

  return <span>{state}</span>;
}

const exampleSelector = ({["login-form"]: lf, ["user_input"]: ui}) => {
  return [Object.entries(lf?.data ?? {}).map(([key, value]) => `${key}=${value}`).join('&'), ui?.data];
};

function keysSelector() {
  return ["login-form", "user_input"];
}

function ResumeS() {
  const [state, ui] = useAsyncStateSelector(keysSelector, exampleSelector);

  // console.log('________', state, ui)
  return <span>{state} - {ui}</span>;
}

export default function Navigation() {
  return (
    <ul style={{display: "flex", justifyContent: 'space-around'}}>
      <li>
        <ResumeS/>
      </li>
      <li>
        <Link to="/">Basique usage</Link>
      </li>
      <li>
        <Link to="/users/1">Routing</Link>
      </li>
      <li>
        <Link to="/reducers">Reducers</Link>
      </li>
      <li>
        <Link to="/replace-state">Replace state</Link>
      </li>
      <li>
        <Link to="/standalone">Standalone</Link>
      </li>
      <li>
        <Link to="/selectors">Selectors</Link>
      </li>
      <li>
        <Link to="/redux">Redux</Link>
      </li>
      <li>
        <Link to="/next">Next</Link>
      </li>
      <li>
        <Link to="/demo">Demo</Link>
      </li>
      <li>
        <Link to="/emit">Emit</Link>
      </li>
    </ul>
  );
}
