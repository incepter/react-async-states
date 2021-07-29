import React from "react";
import { Link} from "react-router-dom";

export default function Navigation() {
  return (
    <ul style={{display: "flex", justifyContent: 'space-around'}}>
      <li>
        <Link to="/">Basique usage</Link>
      </li>
      <li>
        <Link to="/routing">Routing</Link>
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
    </ul>
  );
}
