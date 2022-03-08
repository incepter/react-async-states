import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import App from './past/v2/Bug';
// import App2 from './past/App2';


// ReactDOM.createRoot(document.getElementById('root')).render(<React.Suspense fallback="app suspended"><App/></React.Suspense>);
ReactDOM.render(<App/>, document.getElementById('root'));

// const anotherRoot = document.createElement("div");
// document.body.appendChild(anotherRoot);
//
// ReactDOM.render(<App2/>, anotherRoot);
