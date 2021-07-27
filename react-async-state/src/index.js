import * as React from 'react'

export { useAsyncState } from "./react-async-state/useAsyncState";
export { AsyncStateProvider } from "./react-async-state/provider/AsyncStateProvider";
export { useAsyncStateSelector } from "./react-async-state/selector/useAsyncStateSelector";

export const useMyHook = () => {
  let [{
    counter
  }, setState] = React.useState({
    counter: 0
  })

  React.useEffect(() => {
    let interval = window.setInterval(() => {
      counter++
      setState({counter})
    }, 1000)
    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return counter
}
