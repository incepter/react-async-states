import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from "./past/App";

// import App2 from './past/App2';

ReactDOM.createRoot(document.getElementById('root'))
  .render(
    <React.StrictMode>
      <React.Suspense fallback="app suspended">
        <App/>
      </React.Suspense>
    </React.StrictMode>
  );
// ReactDOM.render(
//   <React.StrictMode><App/></React.StrictMode>, document.getElementById('root'));

// const anotherRoot = document.createElement("div");
// document.body.appendChild(anotherRoot);
//
// ReactDOM.render(<App2/>, anotherRoot);
