import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import App from './example1';

// ReactDOM.createRoot(document.getElementById('root')).render(<React.Suspense fallback="app suspended"><App/></React.Suspense>);
ReactDOM.render(<App/>, document.getElementById('root'));
