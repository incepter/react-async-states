import React from "react";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

function Wrapper({children}) {
  const [visible, setVisible] = React.useState(true);
  return (
    <div>
      <button onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>
      <br/>
      {visible && children}
    </div>
  );
}

function TimeoutSubscription() {
  const {state: {status}, key, run} = useAsyncState({key: demoAsyncStates.timeout.key, lazy: false});

  return (
    <div>
      {`${status}-${key}`}
      <button onClick={() => run()}>Run</button>
    </div>
  );
}

export default function Demo() {

  return (
    <>
      <Wrapper>
        <TimeoutSubscription/>
      </Wrapper>
      <Wrapper>
        <TimeoutSubscription/>
      </Wrapper>
    </>
  );
}
