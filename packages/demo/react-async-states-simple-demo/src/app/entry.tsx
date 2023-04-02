import * as React from 'react'
import {app, logout} from "./app";
import LoginPage from "./login/page";
import "./entry.css"
import {Link, Outlet } from 'react-router-dom';

function isUnauthorized(error) {
  return error?.toString?.() === "Error: No saved user"
}

export function Component() {
  let data;
  try {
    data = app.auth.current.use()
  } catch (e) {
    let knownError = isUnauthorized(e);
    if (knownError) {
      return <LoginPage/>
    }
  }

  return (
    <div className="App">
      <div className="main">
        <div>
          Use The app as : <LoginPage/>
        </div>
        <hr />
        <div>
          <div>
            <button onClick={logout}>Logout</button>
            <details>
              <summary>Using The app as user: {data!.id} - {data!.username}</summary>
              <pre>{JSON.stringify(data, null, 4)}</pre>
            </details>
          </div>
          <hr />
          <nav style={{display: "flex", flexDirection: "column"}}>
            <Link to="users">Users list</Link>
            <Link to="posts">Posts list</Link>
          </nav>
          <hr />
          <React.Suspense>
            <Outlet />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
