import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {mockDateNow} from "../../utils/setup";
import {createSource} from "../../../../helpers/create-async-state";
import {useAsyncState} from "../../../../hooks/useAsyncState";
import {AsyncStateProvider} from "../../../../provider/AsyncStateProvider";
import {
  runpSourceLane,
  runSource,
  runSourceLane
} from "../../../../helpers/run-source";

mockDateNow();

describe('subscribe to lane and operate on it', () => {
  let intervalIds: ReturnType<typeof setInterval>[] = [];
  afterEach(() => {
    intervalIds.forEach(id => clearInterval(id));
    intervalIds = [];
  });

  function countersProducer(props) {
    let intervalId = setInterval(() => props.emit(old => old.data + 1), 1000);
    intervalIds.push(intervalId);
    props.onAbort(() => clearInterval(intervalId));
    return props.lastSuccess.data;
  }

  const countersSource = createSource(
    "counters",
    countersProducer,
    {initialValue: 0},
  );

  function Runner() {
    const {run} = useAsyncState(async function (props) {
      props.run("counters", {lane: "counter-1"})
      props.runp("counters", {lane: "counter-1-extra"})
      props.runp("not-found", null)
    })
    return <button data-testid="runner-run" onClick={() => run()}>run</button>;
  }

  function LanesIntervalDemo() {
    return (
      <div>
        <Runner />
        <CounterSub/>

        <CounterSub alias="2" counterKey="counter-2"/>
        <CounterSub counterKey="counter-2-extra"/>


        <CounterSub alias="1" counterKey="counter-1"/>
        <CounterSub counterKey="counter-1-extra"/>
      </div>
    );
  }

  function CounterSub({counterKey = "default", alias = "default"}) {
    const {state: {data}, run} = useAsyncState({
      lane: counterKey,
      key: "counters",
    });
    return (
      <div>
        <button
          data-testid={`counter-sub-${counterKey}-${alias}-run`}
          onClick={() => run()}
        >Run
        </button>
        <span
          data-testid={`counter-sub-${counterKey}-${alias}-data`}
        >
        counter-{counterKey}-{alias}-{data}
      </span>
      </div>
    );
  }

  it('should subscribe to lane and operate on it', async () => {
    // given
    jest.useFakeTimers();
    // when
    render(
      <React.StrictMode>
        <AsyncStateProvider initialStates={[countersSource]}>
          <LanesIntervalDemo/>
        </AsyncStateProvider>
      </React.StrictMode>
    )

    // then
    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-default-default-data").innerHTML)
      .toEqual("counter-default-default-0");
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-0");
    expect(screen.getByTestId("counter-sub-counter-2-extra-default-data").innerHTML)
      .toEqual("counter-counter-2-extra-default-0");

    const runnerRun = screen.getByTestId("runner-run");
    const runDefaultCounter = screen.getByTestId("counter-sub-default-default-run");
    const runCounter2Extra = screen.getByTestId("counter-sub-counter-2-extra-default-run");

    // then
    act(() => {
      fireEvent.click(runDefaultCounter);
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });

    // then
    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-default-default-data").innerHTML)
      .toEqual("counter-default-default-1");
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-0");
    expect(screen.getByTestId("counter-sub-counter-2-extra-default-data").innerHTML)
      .toEqual("counter-counter-2-extra-default-0");

    // now, let's run counter-3

    act(() => {
      runSourceLane(countersSource, "counter-2");
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });

    // then
    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-default-default-data").innerHTML)
      .toEqual("counter-default-default-2");
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-1");
    expect(screen.getByTestId("counter-sub-counter-2-extra-default-data").innerHTML)
      .toEqual("counter-counter-2-extra-default-0");

    act(() => {
      runpSourceLane(countersSource, "counter-2-extra");
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });
    // then
    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-default-default-data").innerHTML)
      .toEqual("counter-default-default-3");
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-2");
    expect(screen.getByTestId("counter-sub-counter-2-extra-default-data").innerHTML)
      .toEqual("counter-counter-2-extra-default-1");

    // now let's run lanes from producers

    act(() => {
      fireEvent.click(runnerRun);
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });

    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-counter-1-1-data").innerHTML)
      .toEqual("counter-counter-1-1-1");
    expect(screen.getByTestId("counter-sub-counter-1-extra-default-data").innerHTML)
      .toEqual("counter-counter-1-extra-default-1");
  });
});

