import React from "react";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

function Wrapper({children, initialValue = true}) {
  const [visible, setVisible] = React.useState(initialValue);
  return (
    <React.Suspense fallback="Pending...">
      <button onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>
      <br/>
      {visible && children}
    </React.Suspense>
  );
}

function TimeoutSubscription({ mode }) {
  const {state: {status}, key, run} = useAsyncState[mode](demoAsyncStates.timeout.key);

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
        <TimeoutSubscription mode="lazy"/>
      </Wrapper>
      <Wrapper>
        <TimeoutSubscription mode="auto"/>
      </Wrapper>

      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <section>
        waiting demo
        <p>
          <WaitingDemo />
          <Wrapper initialValue={false}>
            <WaitingHoister />
          </Wrapper>
        </p>
      </section>
    </>
  );
}

function WaitingDemo() {
  const {key, state, run, mode} = useAsyncState({key: "waiting_demo", selector: s => s.data});

  return <span>
    {mode+" waiting for state: " + key + " , " + JSON.stringify(state ?? {})}
    <button onClick={() => run()}>Run</button>
  </span>;
}

function WaitingHoister() {
  const {state} = useAsyncState({key: "waiting_demo", hoistToProvider: true, initialValue: "haha", producer: props => props.args[0] ?? 5});

  return "hoister:" + JSON.stringify(state);
}
