import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import App from './past/App';

// ReactDOM.createRoot(document.getElementById('root')).render(<React.Suspense fallback="app suspended"><App/></React.Suspense>);
ReactDOM.render(<App/>, document.getElementById('root'));
