import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from "./App2";

import App2 from './past/v2/Bug2';

ReactDOM.createRoot(document.getElementById('root'))
  .render(
    <React.StrictMode>
      <React.Suspense fallback="app suspended">
        <App2/>
      </React.Suspense>
    </React.StrictMode>
  );
// ReactDOM.render(
//   <React.StrictMode><App/></React.StrictMode>, document.getElementById('root'));

// const anotherRoot = document.createElement("div");
// document.body.appendChild(anotherRoot);
//
// ReactDOM.render(<App2/>, anotherRoot);
