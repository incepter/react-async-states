import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {mockDateNow} from "../../utils/setup";
import {createSource} from "../../../../helpers/create-async-state";
import {useAsyncState} from "../../../../hooks/useAsyncState";
import {
  runpSourceLane,
  runSource,
  runSourceLane
} from "../../../../hooks/useRun";

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

  function LanesIntervalDemo() {
    return (
      <div>
        <CounterSub/>
        <CounterSub alias="1"/>
        <CounterSub counterKey="counter-3"/>
        <CounterSub counterKey="counter-4"/>
        <CounterSub counterKey="counter-2-extra"/>
        <CounterSub alias="1" counterKey="counter-1"/>
        <CounterSub alias="2" counterKey="counter-2"/>
      </div>
    );
  }

  function CounterSub({counterKey = "default", alias = "default"}) {
    const {state: {data}, run} = useAsyncState({
      lane: counterKey,
      source: countersSource,
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
        <LanesIntervalDemo/>
      </React.StrictMode>
    )

    // then
    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-default-default-data").innerHTML)
      .toEqual("counter-default-default-0");
    expect(screen.getByTestId("counter-sub-default-1-data").innerHTML)
      .toEqual("counter-default-1-0");
    expect(screen.getByTestId("counter-sub-counter-3-default-data").innerHTML)
      .toEqual("counter-counter-3-default-0");
    expect(screen.getByTestId("counter-sub-counter-4-default-data").innerHTML)
      .toEqual("counter-counter-4-default-0");
    expect(screen.getByTestId("counter-sub-counter-1-1-data").innerHTML)
      .toEqual("counter-counter-1-1-0");
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-0");

    const runDefaultCounter = screen.getByTestId("counter-sub-default-default-run");
    const runCounter1 = screen.getByTestId("counter-sub-counter-1-1-run");
    const runCounter2 = screen.getByTestId("counter-sub-counter-2-2-run");

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
    expect(screen.getByTestId("counter-sub-default-1-data").innerHTML)
      .toEqual("counter-default-1-1");
    expect(screen.getByTestId("counter-sub-counter-1-1-data").innerHTML)
      .toEqual("counter-counter-1-1-0"); // was not ran
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-0");


    act(() => {
      fireEvent.click(runCounter1);
    });

    await act(async () => {
      await jest.advanceTimersByTime(3000);
    });

    // then
    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-default-default-data").innerHTML)
      .toEqual("counter-default-default-4");
    expect(screen.getByTestId("counter-sub-default-1-data").innerHTML)
      .toEqual("counter-default-1-4");
    expect(screen.getByTestId("counter-sub-counter-1-1-data").innerHTML)
      .toEqual("counter-counter-1-1-3");
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-0");
    expect(screen.getByTestId("counter-sub-counter-3-default-data").innerHTML)
      .toEqual("counter-counter-3-default-0"); // not ran
    expect(screen.getByTestId("counter-sub-counter-4-default-data").innerHTML)
      .toEqual("counter-counter-4-default-0"); // not ran


    // now, let's run counter-3

    act(() => {
      runSourceLane(countersSource, "counter-3");
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });

    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-counter-3-default-data").innerHTML)
      .toEqual("counter-counter-3-default-1");
    expect(screen.getByTestId("counter-sub-counter-4-default-data").innerHTML)
      .toEqual("counter-counter-4-default-0");

    act(() => {
      runpSourceLane(countersSource, "counter-4");
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });

    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-counter-3-default-data").innerHTML)
      .toEqual("counter-counter-3-default-2");
    expect(screen.getByTestId("counter-sub-counter-4-default-data").innerHTML)
      .toEqual("counter-counter-4-default-1");


    // now let's run lanes from producers

    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-0");
    expect(screen.getByTestId("counter-sub-counter-2-extra-default-data").innerHTML)
      .toEqual("counter-counter-2-extra-default-0");
    act(() => {
      runSource(
        createSource(
          "temporary-will-run-counter-2",
          async function (props) {
            props.run(countersSource, {lane: "counter-2-extra"})
            props.runp(countersSource, {lane: "counter-2"})
          }
        )
      )
    });

    await act(async () => {
      await jest.advanceTimersByTime(1000);
    });

    // counter-{counterKey}-{alias}-{data}
    expect(screen.getByTestId("counter-sub-counter-2-2-data").innerHTML)
      .toEqual("counter-counter-2-2-1");
    expect(screen.getByTestId("counter-sub-counter-2-extra-default-data").innerHTML)
      .toEqual("counter-counter-2-extra-default-1");

  });
});

