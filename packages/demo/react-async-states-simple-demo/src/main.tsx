import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {app} from "./app/app";
import DefaultErrorBoundary from "./app/error-boundary";
import { RouterProvider } from 'react-router-dom';
import {router} from "./app/routing";

app.auth
  .current()
  .runp()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <DefaultErrorBoundary>
          <RouterProvider router={router} />
        </DefaultErrorBoundary>
      </React.StrictMode>,
    )
  })
